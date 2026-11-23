import { useContext, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from '@xstate/store/react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchJobsForWorkspace } from '@/services/workflowJobService'
import { JOB_REFRESH_MS, shouldRefreshJobs } from '@/library/runPanelJobs'

/**
 * The workspace's jobs for the run panel, read from one jobs list request. While a job started in
 * this visit is running, the list is read again every 30 seconds. A refresh is not started while
 * one is still waiting for an answer.
 *
 * @param wanted - The jobs are shown, for example on the Workflow outputs tab. Jobs started in
 *   this visit are always read, for the badge.
 */
export const useRunPanelJobs = (wanted: boolean) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const visitJobs = useSelector(dataFinderStore, (state) => state.context.visitJobs)
  const startedIds = visitJobs.map((job) => job.jobId)

  const query = useQuery({
    queryKey: ['RunPanelJobs', currentWorkspace],
    queryFn: () => fetchJobsForWorkspace(currentWorkspace ?? '', token ?? ''),
    enabled: !!token && !!currentWorkspace && (wanted || startedIds.length > 0),
    refetchOnWindowFocus: false,
    refetchInterval: (current) =>
      current.state.status !== 'error' &&
      shouldRefreshJobs(current.state.data?.jobs ?? [], startedIds)
        ? JOB_REFRESH_MS
        : false,
  })

  // New jobs started, so read the list for them, joining a request that is already on its way
  const { refetch, isFetched } = query
  const startedCount = startedIds.length
  useEffect(() => {
    if (startedCount > 0 && isFetched) void refetch({ cancelRefetch: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedCount])

  return { query, visitJobs, startedIds }
}
