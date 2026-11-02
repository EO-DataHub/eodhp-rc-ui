import type { SavedSet } from '@/services/savedSetsService'
import type { LaunchItem } from '@/services/workflowVariableResolvers'

/** The most job requests rc-ui has open at once when it runs a workflow on many items. */
export const MAX_JOBS_IN_FLIGHT = 4

/** Turns the entries of a saved set into items a workflow can run on. */
export const savedSetLaunchItems = (set: SavedSet): LaunchItem[] =>
  set.items.map((entry) => ({
    id: entry.itemId,
    collection: entry.collectionId,
    links: [{ rel: 'self', href: entry.selfHref }],
  }))

export interface StartedJob {
  item: LaunchItem
  jobId: string | null
}

export interface FailedJob {
  item: LaunchItem
  error: string
}

export interface FanOutResult {
  started: StartedJob[]
  failed: FailedJob[]
}

const errorMessage = (err: unknown) =>
  err instanceof Error && err.message ? err.message : 'Failed to start the job.'

/**
 * Starts one job per item, with at most `limit` requests open at once. A failed request does not
 * stop the others. Started and failed jobs keep the order of `items`.
 */
export const submitJobs = async (
  items: LaunchItem[],
  launch: (item: LaunchItem) => Promise<{ workflowId?: string }>,
  limit = MAX_JOBS_IN_FLIGHT,
): Promise<FanOutResult> => {
  const outcomes: ({ jobId: string | null } | { error: string })[] = new Array(items.length)
  let next = 0

  const worker = async () => {
    while (next < items.length) {
      const index = next
      next += 1
      try {
        const response = await launch(items[index])
        const jobId = response.workflowId?.trim()
        outcomes[index] = { jobId: jobId ? jobId : null }
      } catch (err) {
        outcomes[index] = { error: errorMessage(err) }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))

  const result: FanOutResult = { started: [], failed: [] }
  outcomes.forEach((outcome, index) => {
    if ('error' in outcome) result.failed.push({ item: items[index], error: outcome.error })
    else result.started.push({ item: items[index], jobId: outcome.jobId })
  })
  return result
}
