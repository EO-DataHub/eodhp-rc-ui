import { WorkflowJob, WorkflowJobDisplayData } from '@/types'
import { formatOrderDate } from './orderUtils'

/**
 * Transforms a WorkflowJob to WorkflowJobDisplayData for table display
 * @param job - The workflow job to transform
 * @param workspace - The workspace name
 * @returns Transformed job data ready for display
 */
export const transformJobForDisplay = (
  job: WorkflowJob,
  workspace: string,
): WorkflowJobDisplayData => {
  const createdDate = new Date(job.created)
  const finishedDate = job.finished ? new Date(job.finished) : null

  return {
    id: job.id,
    processID: job.processID,
    status: job.status,
    createdDate,
    finishedDate,
    createdFormatted: formatOrderDate(job.created),
    finishedFormatted: job.finished ? formatOrderDate(job.finished) : 'N/A',
    workspace: job.workspace ?? workspace,
  }
}

/**
 * Sorts workflow jobs by created timestamp in descending order (newest first)
 * @param jobs - Array of workflow jobs to sort
 * @returns Sorted array with newest jobs first
 */
export const sortJobsByCreated = (jobs: WorkflowJob[]): WorkflowJob[] => {
  return [...jobs].sort((a, b) => {
    const dateA = new Date(a.created).getTime()
    const dateB = new Date(b.created).getTime()
    return dateB - dateA // Descending order (newest first)
  })
}

/** The workspace part of a job link: `…/catalogs/<workspace>/jobs/<job id>` */
const JOB_LINK_WORKSPACE = /\/catalogs\/([^/]+)\/jobs\/[^/]+/

/**
 * Returns the workspace a job ran in, read from its links (the `self` link first), or undefined
 * when no link names one.
 */
export const getJobWorkspaceFromLinks = (job: WorkflowJob): string | undefined => {
  const links = [...(job.links ?? [])].sort(
    (a, b) => Number(b.rel === 'self') - Number(a.rel === 'self'),
  )
  for (const link of links) {
    try {
      const match = new URL(link.href, 'http://localhost').pathname.match(JOB_LINK_WORKSPACE)
      if (match) return decodeURIComponent(match[1])
    } catch {
      // Not a URL, try the next link
    }
  }
  return undefined
}

/** One jobs list loaded newest first, one page at a time */
export interface PagedJobList {
  /** The jobs loaded so far */
  jobs: WorkflowJob[]
  /** Whether the list has more pages to load */
  hasMore: boolean
}

const createdTime = (job: WorkflowJob): number => new Date(job.created).getTime()

/**
 * Merges jobs lists that are each loaded newest first, one page at a time.
 *
 * While a list has more pages, jobs older than its oldest loaded job may still be to come. So
 * `jobs` leaves out every job older than that, in all the lists, and is never shown out of
 * order. Jobs with no valid `created` time are always kept.
 *
 * @returns `jobs` to show, newest first, each job once; and `listsToLoad`, the indexes of the
 *   lists whose next page is needed to show more jobs
 */
export const mergePagedJobLists = (
  lists: PagedJobList[],
): { jobs: WorkflowJob[]; listsToLoad: number[] } => {
  const oldestLoaded = lists.map((list) => {
    const times = list.jobs.map(createdTime).filter((time) => !Number.isNaN(time))
    return times.length > 0 ? Math.min(...times) : undefined
  })

  // A list with more pages but no dated jobs loaded gives no cutoff; it is loaded next
  let cutoff = -Infinity
  lists.forEach((list, index) => {
    const oldest = oldestLoaded[index]
    if (list.hasMore && oldest !== undefined) cutoff = Math.max(cutoff, oldest)
  })

  const byId = new Map<string, WorkflowJob>()
  lists.forEach((list) => list.jobs.forEach((job) => byId.set(job.id, job)))
  const jobs = sortJobsByCreated([...byId.values()]).filter((job) => {
    const time = createdTime(job)
    return Number.isNaN(time) || time >= cutoff
  })

  const listsToLoad = lists
    .map((list, index) => ({ list, oldest: oldestLoaded[index], index }))
    .filter(({ list, oldest }) => list.hasMore && (oldest === undefined || oldest === cutoff))
    .map(({ index }) => index)

  return { jobs, listsToLoad }
}

/**
 * Whether a paged jobs list should still count as having more pages.
 *
 * If its first page failed, nothing was loaded, so it stops counting: the other lists are not
 * held back waiting for it. If a later page failed, it keeps counting, so the older jobs of
 * the other lists stay held back and "Load more" asks for the failed page again.
 */
export const pagedListHasMore = ({
  hasNextPage,
  isError,
  hasLoadedPages,
}: {
  hasNextPage: boolean
  isError: boolean
  hasLoadedPages: boolean
}): boolean => (isError && !hasLoadedPages ? false : hasNextPage)
