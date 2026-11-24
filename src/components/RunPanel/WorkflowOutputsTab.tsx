import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import { Button, Flex, Text } from '@radix-ui/themes'
import type { WorkflowJob } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { formatOrderDate } from '@/library/orderUtils'
import { jobRows, type JobRow, type VisitJob } from '@/library/runPanelJobs'
import { JobStatus, JobView } from './JobView'
import styles from './RunPanel.module.scss'

const JobRowEntry = ({ row }: { row: JobRow }) => (
  <li className={styles.jobRow}>
    <Flex direction="column" gap="1">
      <Flex justify="between" align="center" gap="2">
        <Button
          variant="ghost"
          size="2"
          className={styles.jobOpen}
          onClick={() => dataFinderStore.send({ type: 'openJob', jobId: row.id })}
        >
          {row.workflowTitle}
        </Button>
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
  /** The jobs of the shared results list and the user's own list. */
  jobs: WorkflowJob[]
  isLoading: boolean
  /** Why the jobs did not load, if they did not. */
  error?: unknown
  onRetry: () => void
  visitJobs: readonly VisitJob[]
  /** The chosen workflow, to filter the Workflow outputs page to. */
  workflowId?: string
}

/**
 * The run panel's list of the user's and the shared results jobs, with the jobs started in this
 * visit first. An opened job is shown in place of the list.
 */
export const WorkflowOutputsTab: React.FC<WorkflowOutputsTabProps> = ({
  jobs,
  isLoading,
  error,
  onRetry,
  visitJobs,
  workflowId,
}) => {
  const openJobId = useSelector(dataFinderStore, (state) => state.context.openJobId)
  const pageLink = workflowId
    ? `/my-data/workflow-outputs?workflow=${encodeURIComponent(workflowId)}`
    : '/my-data/workflow-outputs'

  const rows = jobRows(jobs, visitJobs)
  const openRow = openJobId ? rows.find((row) => row.id === openJobId) : undefined

  if (openRow) {
    return (
      <JobView
        row={openRow}
        job={jobs.find((job) => job.id === openRow.id)}
        onBack={() => dataFinderStore.send({ type: 'closeJob' })}
      />
    )
  }

  const list = () => {
    if (error) {
      return (
        <Flex direction="column" gap="2" align="start">
          <Text size="2" color="red">
            Could not load your workflow outputs. {error instanceof Error ? error.message : ''}
          </Text>
          <Button variant="soft" size="2" onClick={onRetry}>
            Try again
          </Button>
        </Flex>
      )
    }
    if (isLoading) return <LoadingIndicator size="2" />
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
          <JobRowEntry key={row.id} row={row} />
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
