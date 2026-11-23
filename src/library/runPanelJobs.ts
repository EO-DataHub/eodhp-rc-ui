import type { WorkflowJob } from '@/types'

/** How often the run panel reads the jobs list while a job started in this visit is running. */
export const JOB_REFRESH_MS = 30_000

/** A job started from the run panel during this visit to the Data Finder. */
export interface VisitJob {
  jobId: string
  itemId: string
  workflowId: string
  workflowTitle: string
  /** When the run panel started it, for ordering until the jobs list has it. */
  startedAt: string
}

export interface StartedJobCounts {
  running: number
  finished: number
  failed: number
}

const jobsById = (jobs: WorkflowJob[]) => new Map(jobs.map((job) => [job.id, job]))

/**
 * Counts the jobs started in this visit by status. "Finished" means succeeded. A started job that
 * the jobs list does not show yet counts as running.
 */
export const countStartedJobs = (
  jobs: WorkflowJob[],
  startedIds: readonly string[],
): StartedJobCounts => {
  const listed = jobsById(jobs)
  const counts: StartedJobCounts = { running: 0, finished: 0, failed: 0 }
  for (const id of new Set(startedIds)) {
    const status = listed.get(id)?.status ?? 'running'
    if (status === 'successful') counts.finished += 1
    else if (status === 'failed') counts.failed += 1
    else counts.running += 1
  }
  return counts
}

/** Whether to read the jobs list again: while any job started in this visit is still running. */
export const shouldRefreshJobs = (jobs: WorkflowJob[], startedIds: readonly string[]) =>
  countStartedJobs(jobs, startedIds).running > 0

/** The badge text for the jobs of this visit, for example "1 running, 1 finished, 1 failed". */
export const startedJobCountsText = ({ running, finished, failed }: StartedJobCounts) => {
  const parts = [`${running} running`, `${finished} finished`]
  if (failed > 0) parts.push(`${failed} failed`)
  return parts.join(', ')
}

const newestFirst = (a: { created: string }, b: { created: string }) =>
  new Date(b.created).getTime() - new Date(a.created).getTime()

export interface JobRow {
  id: string
  workflowTitle: string
  itemId?: string
  /** The listed status, or undefined for a started job the list does not show yet. */
  status?: WorkflowJob['status']
  created: string
}

/**
 * The rows of the Workflow outputs tab: the jobs started in this visit first, then the rest, each
 * newest first. A started job the list does not show yet is included without a status.
 */
export const jobRows = (jobs: WorkflowJob[], visitJobs: readonly VisitJob[]): JobRow[] => {
  const listed = jobsById(jobs)
  const visitIds = new Set(visitJobs.map((job) => job.jobId))

  const visitRows = visitJobs.map((visitJob): JobRow => {
    const job = listed.get(visitJob.jobId)
    return {
      id: visitJob.jobId,
      workflowTitle: visitJob.workflowTitle,
      itemId: visitJob.itemId,
      status: job?.status,
      created: job?.created ?? visitJob.startedAt,
    }
  })

  const otherRows = jobs
    .filter((job) => !visitIds.has(job.id))
    .map(
      (job): JobRow => ({
        id: job.id,
        workflowTitle: job.processID,
        status: job.status,
        created: job.created,
      }),
    )

  return [...visitRows.sort(newestFirst), ...otherRows.sort(newestFirst)]
}
