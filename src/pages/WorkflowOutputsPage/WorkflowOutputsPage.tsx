import React, { useMemo, useState, useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Flex, Text, TextField, Box, Table, Select, Button } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { fetchJobsForWorkspace, fetchJobsForSharedWorkspace } from '@/services/workflowJobService'
import { transformJobForDisplay, sortJobsByCreated } from '@/library/jobUtils'
import { WorkflowJob, JobsApiResponse } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import { PAGE_SIZE } from '@/hooks/useItemsQuery'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { JobDetailsModal } from '@/components/JobDetailsModal/JobDetailsModal'
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
  const [allJobs, setAllJobs] = useState<WorkflowJob[]>([])
  const [workflowJobsPage, setWorkflowJobsPage] = useState(0)
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null)
  const [isJobModalOpen, setIsJobModalOpen] = useState(false)

  const workflowWorkspace = workspaceParam ?? currentWorkspace ?? ''

  // When we have jobId in URL and jobs have loaded, open the job details modal
  useEffect(() => {
    if (!jobIdParam || !allJobs.length) return
    const job = allJobs.find((j) => j.id === jobIdParam || j.jobID === jobIdParam)
    if (job) {
      setSelectedJob(job)
      setIsJobModalOpen(true)
    }
  }, [jobIdParam, allJobs])

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

  const {
    data: jobsResponse,
    isLoading: isLoadingJobs,
    error: jobsError,
  } = useQuery<JobsApiResponse>({
    queryKey: ['WorkflowJobs', workflowWorkspace, sharedResultsWorkspaceName, userInfo?.sub],
    queryFn: async (): Promise<JobsApiResponse> => {
      if (!token || !workflowWorkspace) {
        return Promise.resolve({ jobs: [], links: [], numberTotal: 0 })
      }

      const primary = await fetchJobsForWorkspace(workflowWorkspace, token)

      if (!sharedResultsWorkspaceName) {
        // No shared workspace configured; behave as before
        return {
          ...primary,
          jobs: primary.jobs.map((job) => ({ ...job, workspace: workflowWorkspace })),
        }
      }

      try {
        const shared = await fetchJobsForSharedWorkspace(
          sharedResultsWorkspaceName,
          workflowWorkspace,
          token,
        )

        const annotatedPrimaryJobs = primary.jobs.map((job) => ({
          ...job,
          workspace: workflowWorkspace,
        }))

        const annotatedSharedJobs = shared.jobs.map((job) => ({
          ...job,
          workspace: sharedResultsWorkspaceName,
        }))

        return {
          jobs: [...annotatedPrimaryJobs, ...annotatedSharedJobs],
          links: primary.links,
          numberTotal: primary.numberTotal + shared.numberTotal,
        }
      } catch (error) {
        // If shared workspace fetching fails, fall back to primary workspace jobs only
        // while still annotating them with their workspace.
        const annotatedPrimaryJobs = primary.jobs.map((job) => ({
          ...job,
          workspace: workflowWorkspace,
        }))

        return {
          jobs: annotatedPrimaryJobs,
          links: primary.links,
          numberTotal: primary.numberTotal,
        }
      }
    },
    refetchOnWindowFocus: false,
    enabled: !!token && !!workflowWorkspace && !!userInfo?.sub,
  })

  useEffect(() => {
    if (jobsResponse) {
      setAllJobs(sortJobsByCreated(jobsResponse.jobs))
    }
  }, [jobsResponse])

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

  const workflowJobsPageCount = Math.ceil(displayJobs.length / PAGE_SIZE)
  const paginatedJobs = useMemo(() => {
    const startIndex = workflowJobsPage * PAGE_SIZE
    return displayJobs.slice(startIndex, startIndex + PAGE_SIZE)
  }, [displayJobs, workflowJobsPage])

  useEffect(() => {
    setWorkflowJobsPage(0)
  }, [selectedStatus, searchText, currentWorkspace])

  return (
    <>
      <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
        <Flex direction="column" gap="3">
          <Text size="7" weight="medium">
            Workflow Outputs
          </Text>
          <Text size="3" color="gray">
            View workflow execution jobs and their status
          </Text>
        </Flex>
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
              {workflowJobsPageCount > 1
                ? `Showing ${workflowJobsPage * PAGE_SIZE + 1}-${Math.min(
                    (workflowJobsPage + 1) * PAGE_SIZE,
                    displayJobs.length,
                  )} of ${displayJobs.length} jobs`
                : `Showing ${displayJobs.length} job${displayJobs.length !== 1 ? 's' : ''}`}
              {(selectedStatus !== 'all' || searchText.trim()) && ' (filtered)'}
            </Text>
          </Flex>
          {isLoadingJobs ? (
            <LoadingIndicator size="3" />
          ) : (
            (jobsError ?? displayJobs.length === 0) && (
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
          {paginatedJobs.length > 0 && (
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
                  {paginatedJobs.map((displayJob) => {
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
              {workflowJobsPageCount > 1 && (
                <Flex justify="center" mt="auto">
                  <PageSelector
                    currentPageIndex={workflowJobsPage}
                    nextDisabled={workflowJobsPage === workflowJobsPageCount - 1}
                    onGoToPage={setWorkflowJobsPage}
                    onNextClick={() => setWorkflowJobsPage(workflowJobsPage + 1)}
                    onPreviousClick={() => setWorkflowJobsPage(workflowJobsPage - 1)}
                    pageCount={workflowJobsPageCount}
                    previousDisabled={workflowJobsPage === 0}
                  />
                </Flex>
              )}
            </>
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
