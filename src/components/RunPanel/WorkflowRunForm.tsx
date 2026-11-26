import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@xstate/store/react'
import { Button, Flex, Heading, Text } from '@radix-ui/themes'
import type { ProcessRecord } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useWorkflowRun } from '@/hooks/useWorkflowRun'
import { RUN_PANEL_SHARED_JOBS_KEY } from '@/hooks/useRunPanelJobs'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { RunSourceChoices } from '@/components/WorkflowRun/RunSourceChoices'
import { RunInputs } from '@/components/WorkflowRun/RunInputs'
import { RunReview } from '@/components/WorkflowRun/RunReview'
import { RunStarted } from '@/components/WorkflowRun/RunStarted'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Flex asChild direction="column" gap="2">
    <section>
      <Heading as="h3" size="2">
        {title}
      </Heading>
      {children}
    </section>
  </Flex>
)

/**
 * Sets up and starts a workflow in the run panel, as one form. What it runs on is kept in the
 * store, so it stays while the panel is hidden and item cards can set it.
 */
export const WorkflowRunForm: React.FC<{
  tool: ProcessRecord
  /** Shows the Workflow outputs tab, on the job's view when the run started one job. */
  onViewOutputs: (jobId?: string) => void
}> = ({ tool, onViewOutputs }) => {
  const queryClient = useQueryClient()
  const runSource = useSelector(dataFinderStore, (state) => state.context.runSource)
  const runItem = useSelector(dataFinderStore, (state) => state.context.runItem)
  const runSetId = useSelector(dataFinderStore, (state) => state.context.runSetId)

  const run = useWorkflowRun({
    workflow: tool,
    item: runItem,
    source: runSource ?? (runItem ? 'item' : 'pinned'),
    onSourceChange: (source) => dataFinderStore.send({ type: 'setRunSource', source }),
    setId: runSetId,
    onSetIdChange: (setId) => dataFinderStore.send({ type: 'setRunSetId', setId }),
    // Jobs started here, including retries, are followed on the badge and the Workflow outputs tab
    onJobsStarted: (started) => {
      const startedAt = new Date().toISOString()
      const jobs = started.flatMap(({ item, jobId }) =>
        jobId
          ? [
              {
                jobId,
                itemId: item.id,
                workflowId: tool.id,
                workflowTitle: run.workflowTitle,
                startedAt,
              },
            ]
          : [],
      )
      if (!jobs.length) return
      dataFinderStore.send({ type: 'addVisitJobs', jobs })
      void queryClient.refetchQueries(
        { queryKey: [RUN_PANEL_SHARED_JOBS_KEY] },
        { cancelRefetch: false },
      )
    },
    choosingSource: true,
  })

  // A new item or source from outside the form, such as an item card, shows the form for it
  const [showStarted, setShowStarted] = useState(false)
  const [startedFor, setStartedFor] = useState({ runSource, runItem })
  if (startedFor.runSource !== runSource || startedFor.runItem !== runItem) {
    setStartedFor({ runSource, runItem })
    setShowStarted(false)
  }

  if (!run.detail) {
    if (!run.detailError) return <LoadingIndicator size="2" />
    return (
      <Flex direction="column" gap="2" align="start">
        <Text size="2" color="red">
          {run.detailError}
        </Text>
        <Button variant="soft" size="2" onClick={run.reloadWorkflow}>
          Retry
        </Button>
      </Flex>
    )
  }

  if (showStarted) {
    return (
      <RunStarted
        run={run}
        actions={
          <>
            <Button
              variant="soft"
              color="gray"
              onClick={() =>
                onViewOutputs(
                  run.startedJobs.length === 1 ? run.startedJobs[0].jobId ?? undefined : undefined,
                )
              }
            >
              View in Workflow outputs
            </Button>
            <Button
              onClick={() => {
                run.clearLaunchError()
                setShowStarted(false)
              }}
            >
              Run again
            </Button>
          </>
        }
      />
    )
  }

  const startRun = async () => {
    if (await run.run()) setShowStarted(true)
  }

  return (
    <Flex direction="column" gap="5">
      <Section title="Run on">
        <RunSourceChoices run={run} />
      </Section>
      {run.hasInputsToSet && (
        <Section title="Inputs">
          <RunInputs run={run} />
        </Section>
      )}
      <Section title="Review">
        <RunReview run={run} />
      </Section>
      <Flex justify="end">
        <Button disabled={!run.canRun} onClick={() => void startRun()}>
          {run.isLaunching ? 'Starting…' : 'Run workflow'}
        </Button>
      </Flex>
    </Flex>
  )
}
