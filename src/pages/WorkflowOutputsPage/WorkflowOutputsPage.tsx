import React, { useMemo, useState, useContext, useEffect } from 'react'
import { Flex, Text, TextField, Box, Table, Select, Button } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaces } from '@/services/workspaceTokenService'
import { fetchJobsForWorkspace } from '@/services/workflowJobService'
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
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const [searchText, setSearchText] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(() => {
    const stored = localStorage.getItem('workflowOutputsPageSelectedWorkspace')
    return stored ?? currentWorkspace ?? 'all'
  })
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'successful' | 'failed' | 'running'>(
    'all',
  )
  const [allJobs, setAllJobs] = useState<WorkflowJob[]>([])
  const [workflowJobsPage, setWorkflowJobsPage] = useState(0)
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null)
  const [isJobModalOpen, setIsJobModalOpen] = useState(false)

  const workflowWorkspace = selectedWorkspace === 'all' ? currentWorkspace ?? '' : selectedWorkspace

  const handleWorkspaceChange = (workspace: string) => {
    localStorage.setItem('workflowOutputsPageSelectedWorkspace', workspace)
    setSelectedWorkspace(workspace)
  }

  const handleResetFilters = () => {
    setSelectedStatus('all')
    setSearchText('')
    const resetWorkspace = currentWorkspace ?? 'all'
    localStorage.setItem('workflowOutputsPageSelectedWorkspace', resetWorkspace)
    setSelectedWorkspace(resetWorkspace)
  }

  const { data: allWorkspaces } = useQuery({
    queryKey: ['Workspaces', token],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: !!token,
  })

  const {
    data: jobsResponse,
    isLoading: isLoadingJobs,
    error: jobsError,
  } = useQuery<JobsApiResponse>({
    queryKey: ['WorkflowJobs', workflowWorkspace, token],
    queryFn: (): Promise<JobsApiResponse> => {
      if (!token || !workflowWorkspace) {
        return Promise.resolve({ jobs: [], links: [], numberTotal: 0 })
      }
      return fetchJobsForWorkspace(workflowWorkspace, token)
    },
    refetchOnWindowFocus: false,
    enabled: !!token && !!workflowWorkspace,
  })

  useEffect(() => {
    if (jobsResponse) {
      setAllJobs(sortJobsByCreated(jobsResponse.jobs))
    }
  }, [jobsResponse])

  const workspaceOptions = useMemo(() => {
    const workspaceSet = new Set<string>()
    if (allWorkspaces) {
      allWorkspaces.forEach((ws) => ws.name && workspaceSet.add(ws.name))
    }
    if (currentWorkspace) workspaceSet.add(currentWorkspace)
    return ['all', ...Array.from(workspaceSet).sort()]
  }, [allWorkspaces, currentWorkspace])

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
  }, [selectedStatus, searchText, selectedWorkspace])

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
              <Select.Root size="3" value={selectedWorkspace} onValueChange={handleWorkspaceChange}>
                <Select.Trigger style={{ width: '100%' }} placeholder="Workspace" />
                <Select.Content position="popper">
                  <Select.Group>
                    <Select.Item value="all">All Workspaces</Select.Item>
                    {workspaceOptions
                      .filter((w) => w !== 'all')
                      .map((workspace) => (
                        <Select.Item key={workspace} value={workspace}>
                          {workspace}
                        </Select.Item>
                      ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Box>
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
      <JobDetailsModal job={selectedJob} open={isJobModalOpen} onOpenChange={setIsJobModalOpen} />
    </>
  )
}
