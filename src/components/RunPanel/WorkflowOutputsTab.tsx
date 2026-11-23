import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Flex, Text } from '@radix-ui/themes'
import type { UseQueryResult } from '@tanstack/react-query'
import type { JobsApiResponse, WorkflowJob } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { formatOrderDate } from '@/library/orderUtils'
import { jobRows, type JobRow, type VisitJob } from '@/library/runPanelJobs'
import styles from './RunPanel.module.scss'

const STATUS_COLORS: Record<WorkflowJob['status'], 'blue' | 'green' | 'red'> = {
  running: 'blue',
  successful: 'green',
  failed: 'red',
}

const JobStatus = ({ status }: { status?: WorkflowJob['status'] }) =>
  status ? (
    <Badge color={STATUS_COLORS[status]}>{status}</Badge>
  ) : (
    <Badge color="gray">starting</Badge>
  )

const JobRowEntry = ({ row, workspace }: { row: JobRow; workspace: string }) => (
  <li className={styles.jobRow}>
    <Flex direction="column" gap="1">
      <Flex justify="between" align="center" gap="2">
        <Link to={`/my-data/workflow-outputs/${workspace}/${row.id}`}>
          <Text size="2" weight="medium">
            {row.workflowTitle}
          </Text>
        </Link>
        <JobStatus status={row.status} />
      </Flex>
      {row.itemId && (
        <Text size="1" className={styles.jobItem}>
          {row.itemId}
        </Text>
      )}
      <Text size="1" color="gray">
        Started {formatOrderDate(row.created)}
      </Text>
    </Flex>
  </li>
)

interface WorkflowOutputsTabProps {
  jobs: UseQueryResult<JobsApiResponse>
  visitJobs: readonly VisitJob[]
  /** The chosen workflow, to filter the Workflow outputs page to. */
  workflowId?: string
}

/** The run panel's list of the workspace's jobs, with the jobs started in this visit first. */
export const WorkflowOutputsTab: React.FC<WorkflowOutputsTabProps> = ({
  jobs,
  visitJobs,
  workflowId,
}) => {
  const { currentWorkspace } = useContext(AuthenticationContext)
  const pageLink = workflowId
    ? `/my-data/workflow-outputs?workflow=${encodeURIComponent(workflowId)}`
    : '/my-data/workflow-outputs'

  const rows = jobRows(jobs.data?.jobs ?? [], visitJobs)

  const list = () => {
    if (jobs.isError) {
      return (
        <Flex direction="column" gap="2" align="start">
          <Text size="2" color="red">
            Could not load your workflow outputs.{' '}
            {jobs.error instanceof Error ? jobs.error.message : ''}
          </Text>
          <Button variant="soft" size="2" onClick={() => void jobs.refetch()}>
            Try again
          </Button>
        </Flex>
      )
    }
    if (jobs.isLoading) return <LoadingIndicator size="2" />
    if (rows.length === 0) {
      return (
        <Text size="2" color="gray">
          No workflow outputs yet. Jobs you start appear here.
        </Text>
      )
    }
    return (
      <ul className={styles.jobList}>
        {rows.map((row) => (
          <JobRowEntry key={row.id} row={row} workspace={currentWorkspace ?? ''} />
        ))}
      </ul>
    )
  }

  return (
    <Flex direction="column" gap="4">
      {list()}
      <Button variant="soft" color="gray" asChild>
        <Link to={pageLink}>Open Workflow outputs</Link>
      </Button>
    </Flex>
  )
}
