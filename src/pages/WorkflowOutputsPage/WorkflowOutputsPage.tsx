import React, { useMemo, useState, useContext, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Flex, Text, Box, Table, Select, Button } from '@radix-ui/themes'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchCalledJobs,
  fetchJobById,
  fetchJobsForWorkspace,
  getNextCalledJobsAfter,
  getNextJobsSkip,
  JOBS_PAGE_SIZE,
} from '@/services/workflowJobService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import {
  getJobWorkspaceFromLinks,
  mergePagedJobLists,
  pagedListHasMore,
  transformJobForDisplay,
} from '@/library/jobUtils'
import { WorkflowJob } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { JobDetailsModal } from '@/components/JobDetailsModal/JobDetailsModal'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import styles from '../MyDataPage/MyDataPage.module.scss'

/** Shown as the workspace of a called job whose links do not name the workspace it ran in */
const UNKNOWN_JOB_WORKSPACE = 'Unknown'

export const WorkflowOutputsPage: React.FC = () => {
  const { workspace: workspaceParam, jobId: jobIdParam } = useParams<{
    workspace?: string
    jobId?: string
  }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Set by the run panel's Open Workflow outputs link, to show one workflow's jobs
  const workflowFilter = searchParams.get('workflow') ?? ''
  // Keeps the workflow filter when a job opens and closes
  const filterQuery = workflowFilter ? `?workflow=${encodeURIComponent(workflowFilter)}` : ''
  // The workspace an opened job ran in, when it is not the listed workspace: jobs started on
  // shared workflows run in the workflow's own workspace
  const jobWorkspaceParam = searchParams.get('jobWorkspace') ?? ''
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'successful' | 'failed' | 'running'>(
    'all',
  )
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null)
  const [isJobModalOpen, setIsJobModalOpen] = useState(false)

  const workflowWorkspace = workspaceParam ?? currentWorkspace ?? ''

  const handleJobModalOpenChange = (open: boolean) => {
    setIsJobModalOpen(open)
    if (!open && jobIdParam) {
      void navigate(`/my-data/workflow-outputs${filterQuery}`)
    }
  }

  const handleResetFilters = () => {
    setSelectedStatus('all')
    if (workflowFilter) clearWorkflowFilter()
  }

  const clearWorkflowFilter = () => {
    setSearchParams((params) => {
      params.delete('workflow')
      return params
    })
  }

  const sharedResultsWorkspaceName = import.meta.env.VITE_WORKFLOW_RESULTS_WORKSPACE_NAME

  const queriesEnabled = !!token && !!workflowWorkspace && !!userInfo?.sub

  // The workspace's own jobs, newest first, one page at a time. Listing every job made
  // this page take 10-30 s for workspaces with many jobs.
  const {
    data: ownJobsPages,
    isLoading: isLoadingJobs,
    error: jobsError,
    fetchNextPage: fetchNextOwnPage,
    hasNextPage: hasMoreOwnJobs,
    isFetchingNextPage: isFetchingNextOwnPage,
    isFetchNextPageError: isOwnNextPageError,
  } = useInfiniteQuery({
    queryKey: ['WorkflowJobs', workflowWorkspace, userInfo?.sub],
    queryFn: ({ pageParam }) =>
      fetchJobsForWorkspace(workflowWorkspace, token ?? '', {
        limit: JOBS_PAGE_SIZE,
        skip: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => getNextJobsSkip(lastPage.links),
    refetchOnWindowFocus: false,
    enabled: queriesEnabled,
  })

  // The jobs this workspace started on workflows in other workspaces (for example the shared
  // results workspace), newest first, one page at a time
  const {
    data: calledJobsPages,
    isLoading: isLoadingCalledJobs,
    error: calledJobsError,
    fetchNextPage: fetchNextCalledPage,
    hasNextPage: hasMoreCalledJobs,
    isFetchingNextPage: isFetchingNextCalledPage,
  } = useInfiniteQuery({
    queryKey: ['WorkflowCalledJobs', workflowWorkspace, userInfo?.sub],
    queryFn: ({ pageParam }) => fetchCalledJobs(workflowWorkspace, token ?? '', pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => getNextCalledJobsAfter(lastPage.links),
    // The page waits for this list before showing any jobs, so give up after one retry rather
    // than the default three, which hold the user's own jobs back for about 7 s
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: queriesEnabled,
  })

  const ownJobs = useMemo(
    () =>
      (ownJobsPages?.pages ?? []).flatMap((page) =>
        page.jobs.map((job) => ({ ...job, workspace: workflowWorkspace })),
      ),
    [ownJobsPages, workflowWorkspace],
  )

  // Each called job's links point at the workspace it ran in. Without one, say so rather than
  // let the table show this workspace.
  const calledJobs = useMemo(
    () =>
      (calledJobsPages?.pages ?? []).flatMap((page) =>
        page.jobs.map((job) => ({
          ...job,
          workspace: getJobWorkspaceFromLinks(job) ?? UNKNOWN_JOB_WORKSPACE,
        })),
      ),
    [calledJobsPages],
  )
  const hasLoadedCalledPages = (calledJobsPages?.pages.length ?? 0) > 0

  // Both lists come newest first, a page at a time. Show only the jobs that are in order so far;
  // "Load more" fetches the next page of the list that holds the rest back.
  const { jobs: allJobs, listsToLoad } = useMemo(
    () =>
      mergePagedJobLists([
        { jobs: ownJobs, hasMore: !!hasMoreOwnJobs },
        {
          jobs: calledJobs,
          hasMore: pagedListHasMore({
            hasNextPage: !!hasMoreCalledJobs,
            isError: !!calledJobsError,
            hasLoadedPages: hasLoadedCalledPages,
          }),
        },
      ]),
    [ownJobs, calledJobs, hasMoreOwnJobs, hasMoreCalledJobs, calledJobsError, hasLoadedCalledPages],
  )
  const hasNextPage = listsToLoad.length > 0
  const isFetchingNextPage = isFetchingNextOwnPage || isFetchingNextCalledPage
  const fetchNextPage = () => {
    if (listsToLoad.includes(0)) void fetchNextOwnPage()
    if (listsToLoad.includes(1)) void fetchNextCalledPage()
  }

  // Wait for the first page of both lists before showing any jobs. Otherwise the first list's
  // rows show, then some disappear when the second list moves the cutoff.
  const isLoadingAnyJobs = isLoadingJobs || isLoadingCalledJobs
  const loadedJobs = useMemo(() => [...ownJobs, ...calledJobs], [ownJobs, calledJobs])
  const loadedJobFromUrl = jobIdParam
    ? loadedJobs.find((j) => j.id === jobIdParam || j.jobID === jobIdParam)
    : undefined

  // A job linked from elsewhere may be older than the jobs loaded so far, so fetch it on its own,
  // from the workspace the link says it ran in. Links made before that was in the address name
  // only this workspace; for those, look in the shared results workspace next.
  const { data: fetchedJobFromUrl } = useQuery<WorkflowJob>({
    queryKey: ['WorkflowJob', workflowWorkspace, jobIdParam, jobWorkspaceParam, userInfo?.sub],
    queryFn: async () => {
      const workspaceTokens = await fetchWorkspaceTokens(workflowWorkspace, token ?? '')
      if (jobWorkspaceParam) {
        const job = await fetchJobById(jobWorkspaceParam, jobIdParam ?? '', workspaceTokens.access)
        return { ...job, workspace: jobWorkspaceParam }
      }
      try {
        const job = await fetchJobById(workflowWorkspace, jobIdParam ?? '', workspaceTokens.access)
        return { ...job, workspace: workflowWorkspace }
      } catch (error) {
        if (!sharedResultsWorkspaceName || sharedResultsWorkspaceName === workflowWorkspace) {
          throw error
        }
        const job = await fetchJobById(
          sharedResultsWorkspaceName,
          jobIdParam ?? '',
          workspaceTokens.access,
        )
        return { ...job, workspace: sharedResultsWorkspaceName }
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: queriesEnabled && !!jobIdParam && !isLoadingAnyJobs && !loadedJobFromUrl,
  })

  // When we have jobId in URL and the job is found, open the job details modal
  const jobFromUrl = loadedJobFromUrl ?? fetchedJobFromUrl
  useEffect(() => {
    if (jobFromUrl) {
      setSelectedJob(jobFromUrl)
      setIsJobModalOpen(true)
    }
  }, [jobFromUrl])

  // The workflow and status filters cover the jobs loaded so far. There is no search: with
  // paging it could only search loaded jobs, and an older job would look missing.
  const filteredJobs = useMemo(() => {
    let filtered = allJobs
    if (workflowFilter) {
      filtered = filtered.filter((job) => job.processID === workflowFilter)
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((job) => job.status === selectedStatus)
    }
    return filtered
  }, [allJobs, selectedStatus, workflowFilter])

  // A failed later page is shown next to Load more, so the main error is only for the first page
  const firstPageError = isOwnNextPageError ? null : jobsError

  const displayJobs = useMemo(() => {
    const workspace = workflowWorkspace || ''
    return filteredJobs.map((job) => transformJobForDisplay(job, workspace))
  }, [filteredJobs, workflowWorkspace])

  return (
    <>
      <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
        <PageHeading
          title="Workflow Outputs"
          subtitle="View workflow execution jobs and their status"
        />
        <Flex direction="column" gap="5">
          <Flex
            p="5"
            direction="row"
            gap="2"
            align="center"
            justify="between"
            className={styles.filterContainer}
            overflow="auto"
          >
            <Box flexGrow="1" width="160px" flexShrink="0">
              <Select.Root
                size="3"
                value={selectedStatus}
                onValueChange={(value) =>
                  setSelectedStatus(value as 'all' | 'successful' | 'failed' | 'running')
                }
              >
                <Select.Trigger style={{ width: '100%' }} placeholder="Status" />
                <Select.Content position="popper">
                  <Select.Group>
                    <Select.Item value="all">All Statuses</Select.Item>
                    <Select.Item value="successful">Successful</Select.Item>
                    <Select.Item value="failed">Failed</Select.Item>
                    <Select.Item value="running">Running</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Box>
            <Box flexGrow="0" flexShrink="0">
              <Button
                size="3"
                variant="soft"
                color="gray"
                onClick={handleResetFilters}
                style={{ minWidth: '160px' }}
              >
                Reset Filters
              </Button>
            </Box>
          </Flex>
          <Flex justify="between" align="center" mb="3">
            <Text size="2" color="gray">
              {`Showing ${displayJobs.length} job${displayJobs.length !== 1 ? 's' : ''}`}
              {(selectedStatus !== 'all' || workflowFilter) && ' (filtered)'}
              {hasNextPage && ', newest first. Load more to see older jobs.'}
            </Text>
            {workflowFilter && (
              <Flex align="center" gap="2">
                <Text size="2">
                  Workflow: <strong>{workflowFilter}</strong>
                </Text>
                <Button size="1" variant="soft" color="gray" onClick={clearWorkflowFilter}>
                  Show all workflows
                </Button>
              </Flex>
            )}
            {isOwnNextPageError && (
              <Text size="2" color="red">
                Could not load more jobs. Try Load more again.
              </Text>
            )}
            {calledJobsError && (
              <Text size="2" color="red">
                {hasLoadedCalledPages
                  ? 'Could not load more jobs run on shared workflows. Try Load more again.'
                  : 'Could not load jobs run on shared workflows.'}
              </Text>
            )}
          </Flex>
          {isLoadingAnyJobs ? (
            <LoadingIndicator size="3" />
          ) : (
            // When the shared-workflow jobs failed to load, an empty list does not mean there are
            // no outputs, so leave the error line above to explain it
            (firstPageError ?? (displayJobs.length === 0 && !hasNextPage && !calledJobsError)) && (
              <Callout
                type={firstPageError ? 'error' : 'info'}
                message={
                  firstPageError
                    ? firstPageError instanceof Error
                      ? firstPageError.message
                      : 'Unable to load workflow outputs. Please try again later.'
                    : 'You currently have no workflow outputs. Your workflow execution jobs will appear here once you run a workflow.'
                }
              />
            )
          )}
          {!isLoadingAnyJobs && displayJobs.length > 0 && (
            <>
              <Table.Root className={styles.ordersTable}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Job ID</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Process ID</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Created Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Finished Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Workspace</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {displayJobs.map((displayJob) => {
                    const job = loadedJobs.find((j) => j.id === displayJob.id)
                    return (
                      <Table.Row
                        key={displayJob.id}
                        onClick={() => {
                          if (job) {
                            setSelectedJob(job)
                            setIsJobModalOpen(true)
                            if (workflowWorkspace) {
                              const query = new URLSearchParams()
                              if (workflowFilter) query.set('workflow', workflowFilter)
                              if (
                                job.workspace &&
                                job.workspace !== workflowWorkspace &&
                                job.workspace !== UNKNOWN_JOB_WORKSPACE
                              ) {
                                query.set('jobWorkspace', job.workspace)
                              }
                              const queryText = query.toString()
                              void navigate(
                                `/my-data/workflow-outputs/${workflowWorkspace}/${job.id}${
                                  queryText ? `?${queryText}` : ''
                                }`,
                              )
                            }
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Cell>
                          <Text size="1" style={{ fontFamily: 'monospace' }}>
                            {displayJob.id}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>{displayJob.processID}</Table.Cell>
                        <Table.Cell>{displayJob.status}</Table.Cell>
                        <Table.Cell>{displayJob.createdFormatted}</Table.Cell>
                        <Table.Cell>{displayJob.finishedFormatted}</Table.Cell>
                        <Table.Cell>{displayJob.workspace}</Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </>
          )}
          {hasNextPage && !isLoadingAnyJobs && (
            <Flex justify="center">
              <Button size="3" variant="soft" onClick={fetchNextPage} loading={isFetchingNextPage}>
                Load more
              </Button>
            </Flex>
          )}
        </Flex>
      </Flex>
      <JobDetailsModal
        job={selectedJob}
        open={isJobModalOpen}
        onOpenChange={handleJobModalOpenChange}
        workspaceName={workflowWorkspace}
      />
    </>
  )
}
