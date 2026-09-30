import { useState } from 'react'
import { useSelector } from '@xstate/store/react'
import { Badge, Button, Card, Flex, Progress, Table, Text } from '@radix-ui/themes'
import { ChevronDownIcon, ChevronRightIcon, ReloadIcon } from '@radix-ui/react-icons'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { convertDateToLocalString } from '@/library/dateUtils'
import demoStore from '../demoStore'
import type { RunBatch } from '../demoTypes'
import { DemoBadge } from '../components/DemoBadge'
import { jobStatus, runSummary, useNow, type JobStatus } from '../runStatus'
import styles from '../components/demo.module.scss'

const STATUS_BADGE: Record<JobStatus, { label: string; color: 'gray' | 'blue' | 'green' | 'red' }> =
  {
    queued: { label: 'Queued', color: 'gray' },
    running: { label: 'Running', color: 'blue' },
    successful: { label: 'Successful', color: 'green' },
    failed: { label: 'Failed', color: 'red' },
  }

const RunCard = ({ run, now }: { run: RunBatch; now: number }) => {
  const [expanded, setExpanded] = useState(false)
  const summary = runSummary(run, now)

  const overall = !summary.isFinished
    ? { label: `Running · ${summary.done} of ${run.jobs.length} done`, color: 'blue' as const }
    : summary.failed > 0
      ? {
          label: `Finished · ${summary.failed} failed`,
          color: 'orange' as const,
        }
      : { label: 'Finished', color: 'green' as const }

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex direction="column" gap="1">
            <Text weight="bold" size="3">
              {run.workflowTitle}
            </Text>
            <Text size="2" color="gray">
              On {run.scopeLabel} · started {convertDateToLocalString(new Date(run.startedAt))} ·{' '}
              {run.workspace} · about {run.credits} credits
            </Text>
          </Flex>
          <Badge color={overall.color} variant="soft" size="2">
            {overall.label}
          </Badge>
        </Flex>

        <Progress value={summary.progress} color={summary.failed ? 'orange' : undefined} />

        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Button variant="ghost" size="1" onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            {run.jobs.length === 1 ? '1 job' : `${run.jobs.length} jobs`}
          </Button>
          {summary.isFinished && summary.failed > 0 && (
            <Button
              size="1"
              variant="soft"
              onClick={() => demoStore.send({ type: 'retryFailedJobs', runId: run.id })}
            >
              <ReloadIcon /> Retry {summary.failed} failed
            </Button>
          )}
        </Flex>

        {expanded && (
          <Table.Root size="1">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Input</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {run.jobs.map((job, index) => {
                const status = jobStatus(run, job, index, now)
                const badge = STATUS_BADGE[status]
                return (
                  <Table.Row key={job.id} align="center">
                    <Table.Cell>
                      <span className={styles.code}>{job.label}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={badge.color} variant="soft">
                        {badge.label}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {status === 'successful' && (
                        <Button size="1" variant="ghost" disabled>
                          View outputs
                        </Button>
                      )}
                      {status === 'failed' && (
                        <Text size="1" color="red">
                          Stage-in failed: an asset couldn&apos;t be downloaded
                        </Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>
    </Card>
  )
}

export const WorkflowRunsPage = () => {
  const runs = useSelector(demoStore, ({ context }) => context.runs)
  const now = useNow()

  return (
    <Flex direction="column" gap="6" className={styles.page}>
      <Flex justify="between" align="start" gap="4">
        <PageHeading
          title="Workflow runs"
          subtitle="Runs on several items are grouped, so you can follow a whole batch in one place. In the real product this lives under My data → Workflow outputs."
          badge="none"
        />
        <DemoBadge />
      </Flex>

      <Flex direction="column" gap="3">
        {runs.length === 0 && <Text color="gray">No runs yet.</Text>}
        {runs.map((run) => (
          <RunCard key={run.id} run={run} now={now} />
        ))}
      </Flex>
    </Flex>
  )
}
