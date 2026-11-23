import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import { Button, Flex, Heading, Text } from '@radix-ui/themes'
import type { ProcessRecord } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useWorkflowRun, type WorkflowRun } from '@/hooks/useWorkflowRun'
import { runSummaryText } from '@/library/itemDateSpan'
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
 * Sets up and starts a workflow in the run panel, as one form. What it runs on follows the
 * Data Finder's Run buttons through the store, so the form and those buttons stay in step.
 */
export const WorkflowRunForm: React.FC<{ tool: ProcessRecord }> = ({ tool }) => {
  const runSource = useSelector(dataFinderStore, (state) => state.context.runSource)
  const runItem = useSelector(dataFinderStore, (state) => state.context.runItem)

  const run = useWorkflowRun({
    workflow: tool,
    item: runItem,
    source: runSource,
    choosingSource: true,
  })
  const [showStarted, setShowStarted] = useState(false)

  // A Run button in the Data Finder chose a source or item, so show the form for it
  useEffect(() => {
    if (runSource && runSource !== run.source) run.setSource(runSource)
    setShowStarted(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSource, runItem])

  // Choosing a source in the form is kept in the store, for the badge and the next opening
  const formRun: WorkflowRun = {
    ...run,
    setSource: (next) => dataFinderStore.send({ type: 'setRunSource', source: next }),
  }

  if (run.isLoadingDetail || (!run.detail && !run.detailError)) {
    return <LoadingIndicator size="2" />
  }

  if (!run.detail) {
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

  const outputsLink = `/my-data/workflow-outputs?workflow=${encodeURIComponent(run.detail.id)}`

  if (showStarted) {
    return (
      <RunStarted
        run={run}
        actions={
          <>
            <Button variant="soft" color="gray" asChild>
              <Link to={outputsLink}>View in Workflow outputs</Link>
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
        <RunSourceChoices run={formRun} />
      </Section>
      {run.hasInputsToSet && (
        <Section title="Inputs">
          <RunInputs run={run} />
        </Section>
      )}
      <Section title="Review">
        <RunReview
          run={run}
          itemWithoutLinkHint="Choose a different item on the map."
          summary={
            run.items && (
              <Text size="2" weight="medium">
                {runSummaryText(run.items)}
              </Text>
            )
          }
        />
      </Section>
      <Flex justify="end">
        <Button disabled={!run.canRun} onClick={() => void startRun()}>
          {run.isLaunching ? 'Running…' : 'Run workflow'}
        </Button>
      </Flex>
    </Flex>
  )
}
