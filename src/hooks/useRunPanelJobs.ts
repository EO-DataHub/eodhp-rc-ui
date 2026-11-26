import { useContext } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSelector } from '@xstate/store/react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import {
  CALLED_JOBS_MAX_LIMIT,
  fetchCalledJobs,
  fetchJobsForWorkspace,
  JOBS_PAGE_SIZE,
} from '@/services/workflowJobService'
import { JOB_REFRESH_MS, shouldRefreshJobs } from '@/library/runPanelJobs'

/** The started-on-shared-workflows list's query key, so a new run can read the list again at once. */
export const RUN_PANEL_SHARED_JOBS_KEY = 'RunPanelSharedJobs'

/**
 * The jobs for the run panel: the newest page of each of two jobs lists.
 *
 * Jobs started from the panel run on shared workflows, in another workspace, so they are listed
 * among the jobs this workspace started in other workspaces (`scope=called`). That list gives the
 * badge counts, and is read again every 30 seconds while a job started in this visit is running.
 * A refresh is not started while one is still waiting for an answer.
 *
 * The newest jobs come first, so the jobs of this visit are on the first page as long as it holds
 * them all. The page grows with the jobs started in this visit, up to the API's limit of 100.
 *
 * The user's own list is read once when the jobs are shown, and on Try again. It is not refreshed.
 *
 * @param wanted - The jobs are shown, for example on the Workflow outputs tab. The shared list is
 *   always read while there are jobs started in this visit, for the badge.
 */
export const useRunPanelJobs = (wanted: boolean) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const visitJobs = useSelector(dataFinderStore, (state) => state.context.visitJobs)
  const startedIds = visitJobs.map((job) => job.jobId)
  const signedIn = !!token && !!currentWorkspace
  const sharedPageSize = Math.min(
    CALLED_JOBS_MAX_LIMIT,
    Math.max(JOBS_PAGE_SIZE, new Set(startedIds).size),
  )

  const sharedQuery = useQuery({
    queryKey: [RUN_PANEL_SHARED_JOBS_KEY, currentWorkspace, sharedPageSize],
    queryFn: () => fetchCalledJobs(currentWorkspace ?? '', token ?? '', undefined, sharedPageSize),
    enabled: signedIn && (wanted || startedIds.length > 0),
    // A bigger page after a new run keeps showing the last list until it arrives
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchInterval: (current) =>
      current.state.status !== 'error' &&
      shouldRefreshJobs(current.state.data?.jobs ?? [], startedIds)
        ? JOB_REFRESH_MS
        : false,
  })

  const userQuery = useQuery({
    queryKey: ['RunPanelUserJobs', currentWorkspace],
    queryFn: () =>
      fetchJobsForWorkspace(currentWorkspace ?? '', token ?? '', { limit: JOBS_PAGE_SIZE }),
    enabled: signedIn && wanted,
    refetchOnWindowFocus: false,
  })

  const sharedJobs = sharedQuery.data?.jobs ?? []
  const sharedIds = new Set(sharedJobs.map((job) => job.id))
  const userJobs = (userQuery.data?.jobs ?? []).filter((job) => !sharedIds.has(job.id))

  return {
    sharedQuery,
    userQuery,
    /** The jobs of both lists, each job once. */
    allJobs: [...sharedJobs, ...userJobs],
    /** The shared list, for the badge counts. */
    sharedJobs,
    visitJobs,
  }
}
