import React, { useMemo, useState, useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Flex, Text, TextField, Box, Table, Select, Button } from '@radix-ui/themes'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchJobById,
  fetchJobsForWorkspace,
  fetchJobsForSharedWorkspace,
  getNextJobsSkip,
  JOBS_PAGE_SIZE,
} from '@/services/workflowJobService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { transformJobForDisplay, sortJobsByCreated } from '@/library/jobUtils'
import { WorkflowJob } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { JobDetailsModal } from '@/components/JobDetailsModal/JobDetailsModal'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import styles from '../MyDataPage/MyDataPage.module.scss'

export const WorkflowOutputsPage: React.FC = () => {
  const { workspace: workspaceParam, jobId: jobIdParam } = useParams<{
    workspace?: string
    jobId?: string
  }>()
  const navigate = useNavigate()
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)
  const [searchText, setSearchText] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'successful' | 'failed' | 'running'>(
    'all',
  )
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null)
  const [isJobModalOpen, setIsJobModalOpen] = useState(false)

  const workflowWorkspace = workspaceParam ?? currentWorkspace ?? ''

  const handleJobModalOpenChange = (open: boolean) => {
    setIsJobModalOpen(open)
    if (!open && jobIdParam) {
      void navigate('/my-data/workflow-outputs')
    }
  }

  const handleResetFilters = () => {
    setSelectedStatus('all')
    setSearchText('')
  }

  const sharedResultsWorkspaceName = import.meta.env.VITE_WORKFLOW_RESULTS_WORKSPACE_NAME

  const queriesEnabled = !!token && !!workflowWorkspace && !!userInfo?.sub

  // The workspace's own jobs, newest first, one page at a time. Listing every job made
  // this page take 10-30 s for workspaces with many jobs.
  const {
    data: ownJobsPages,
    isLoading: isLoadingJobs,
    error: jobsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
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

  // The user's jobs in the shared results workspace. Most jobs there belong to other users
  // and are removed by the API after paging, so pages would be mostly empty. Fetch them in
  // full, in a separate query, so the user's own jobs are not held up.
  const { data: sharedJobs = [], isLoading: isLoadingSharedJobs } = useQuery<WorkflowJob[]>({
    queryKey: ['WorkflowSharedJobs', sharedResultsWorkspaceName, workflowWorkspace, userInfo?.sub],
    queryFn: async () => {
      try {
        const shared = await fetchJobsForSharedWorkspace(
          sharedResultsWorkspaceName ?? '',
          workflowWorkspace,
          token ?? '',
        )
        return shared.jobs.map((job) => ({ ...job, workspace: sharedResultsWorkspaceName }))
      } catch {
        // If the shared workspace cannot be read, show the workspace's own jobs only
        return []
      }
    },
    refetchOnWindowFocus: false,
    enabled: queriesEnabled && !!sharedResultsWorkspaceName,
  })

  const allJobs = useMemo(() => {
    const ownJobs = (ownJobsPages?.pages ?? []).flatMap((page) =>
      page.jobs.map((job) => ({ ...job, workspace: workflowWorkspace })),
    )
    return sortJobsByCreated([...ownJobs, ...sharedJobs])
  }, [ownJobsPages, sharedJobs, workflowWorkspace])

  const isLoadingAnyJobs = isLoadingJobs || (!!sharedResultsWorkspaceName && isLoadingSharedJobs)
  const loadedJobFromUrl = jobIdParam
    ? allJobs.find((j) => j.id === jobIdParam || j.jobID === jobIdParam)
    : undefined

  // A job linked from elsewhere may be older than the jobs loaded so far, so fetch it on its own
  const { data: fetchedJobFromUrl } = useQuery<WorkflowJob>({
    queryKey: ['WorkflowJob', workflowWorkspace, jobIdParam, userInfo?.sub],
    queryFn: async () => {
      const workspaceTokens = await fetchWorkspaceTokens(workflowWorkspace, token ?? '')
      const job = await fetchJobById(workflowWorkspace, jobIdParam ?? '', workspaceTokens.access)
      return { ...job, workspace: workflowWorkspace }
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

  const filteredJobs = useMemo(() => {
    let filtered = allJobs
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((job) => job.status === selectedStatus)
    }
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(
        (job) =>
          job.id.toLowerCase().includes(searchLower) ||
          job.jobID.toLowerCase().includes(searchLower) ||
          job.processID.toLowerCase().includes(searchLower) ||
          job.message.toLowerCase().includes(searchLower),
      )
    }
    return filtered
  }, [allJobs, searchText, selectedStatus])

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
        <Flex justify="between" align="center">
          <Box />
          <TextField.Root
            placeholder="Search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="3"
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
          </TextField.Root>
        </Flex>
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
              {(selectedStatus !== 'all' || searchText.trim()) && ' (filtered)'}
              {hasNextPage && ', newest first. Load more to see older jobs.'}
            </Text>
            {sharedResultsWorkspaceName && isLoadingSharedJobs && !isLoadingJobs && (
              <Text size="2" color="gray">
                Loading jobs from shared workflows…
              </Text>
            )}
          </Flex>
          {isLoadingJobs ? (
            <LoadingIndicator size="3" />
          ) : (
            (jobsError ?? (displayJobs.length === 0 && !hasNextPage && !isLoadingAnyJobs)) && (
              <Callout
                type={jobsError ? 'error' : 'info'}
                message={
                  jobsError
                    ? jobsError instanceof Error
                      ? jobsError.message
                      : 'Unable to load workflow outputs. Please try again later.'
                    : 'You currently have no workflow outputs. Your workflow execution jobs will appear here once you run a workflow.'
                }
              />
            )
          )}
          {displayJobs.length > 0 && (
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
                    const job = allJobs.find((j) => j.id === displayJob.id)
                    return (
                      <Table.Row
                        key={displayJob.id}
                        onClick={() => {
                          if (job) {
                            setSelectedJob(job)
                            setIsJobModalOpen(true)
                            if (workflowWorkspace) {
                              void navigate(
                                `/my-data/workflow-outputs/${workflowWorkspace}/${job.id}`,
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
          {hasNextPage && !isLoadingJobs && (
            <Flex justify="center">
              <Button
                size="3"
                variant="soft"
                onClick={() => void fetchNextPage()}
                loading={isFetchingNextPage}
              >
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
