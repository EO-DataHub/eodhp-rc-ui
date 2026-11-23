import { useContext, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from '@xstate/store/react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchJobsForSharedWorkspace, fetchJobsForWorkspace } from '@/services/workflowJobService'
import { JOB_REFRESH_MS, shouldRefreshJobs } from '@/library/runPanelJobs'

/**
 * The jobs for the run panel, from two jobs lists.
 *
 * Jobs started from the panel run under the shared results workspace and are listed only there.
 * That list gives the badge counts, and is read again every 30 seconds while a job started in this
 * visit is running. A refresh is not started while one is still waiting for an answer.
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
  const sharedWorkspace = import.meta.env.VITE_WORKFLOW_RESULTS_WORKSPACE_NAME as string | undefined
  const signedIn = !!token && !!currentWorkspace

  const sharedQuery = useQuery({
    queryKey: ['RunPanelSharedJobs', sharedWorkspace, currentWorkspace],
    queryFn: () =>
      fetchJobsForSharedWorkspace(sharedWorkspace ?? '', currentWorkspace ?? '', token ?? ''),
    enabled: signedIn && !!sharedWorkspace && (wanted || startedIds.length > 0),
    refetchOnWindowFocus: false,
    refetchInterval: (current) =>
      current.state.status !== 'error' &&
      shouldRefreshJobs(current.state.data?.jobs ?? [], startedIds)
        ? JOB_REFRESH_MS
        : false,
  })

  const userQuery = useQuery({
    queryKey: ['RunPanelUserJobs', currentWorkspace],
    queryFn: () => fetchJobsForWorkspace(currentWorkspace ?? '', token ?? ''),
    enabled: signedIn && wanted,
    refetchOnWindowFocus: false,
  })

  // New jobs started, so read the shared list for them, joining a request already on its way
  const { refetch, isFetched } = sharedQuery
  const startedCount = startedIds.length
  useEffect(() => {
    if (startedCount > 0 && isFetched) void refetch({ cancelRefetch: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedCount])

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
    startedIds,
  }
}
