import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import { Button, Dialog, Flex, Text } from '@radix-ui/themes'
import type { Item, ProcessDetail, ProcessRecord } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItems } from '@/services/processCatalogueService'
import type { SavedSet } from '@/services/savedSetsService'
import { toolAppliesTo } from '@/library/integrationTools'
import { hasInputsToSet, isFullRecord } from '@/library/workflowRunInputs'
import { useWorkflowRun, type RunSource } from '@/hooks/useWorkflowRun'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { RunSourceChoices } from '@/components/WorkflowRun/RunSourceChoices'
import { RunInputs } from '@/components/WorkflowRun/RunInputs'
import { RunReview } from '@/components/WorkflowRun/RunReview'
import { RunStarted } from '@/components/WorkflowRun/RunStarted'
import styles from './RunWorkflowDialog.module.scss'

export type { RunSource } from '@/hooks/useWorkflowRun'

type Step = 'source' | 'loading' | 'workflow' | 'inputs' | 'review' | 'started'

const STEP_TITLES: Record<Step, string> = {
  source: 'What do you want to run on?',
  loading: 'Run workflow',
  workflow: 'Choose a workflow',
  inputs: 'Check the inputs',
  review: 'Review and run',
  started: 'Workflow started',
}

interface RunWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The item to run on. */
  item?: Item
  /** The workflow to run. When set, the workflow step is skipped. A list record is loaded in full on open. */
  workflow?: ProcessRecord
  /** What to run on when the dialog opens. Defaults to the item. */
  source?: RunSource
  /** The saved set to run on, for the saved set source. */
  savedSet?: SavedSet
  /** Opened outside the Data Finder, so the drawn area is read from where the map saved it. */
  outsideDataFinder?: boolean
}

/** The inputs step is shown when the user has fields to fill in or an area to include. */
const stepFor = (workflow: ProcessDetail): Step =>
  hasInputsToSet(workflow.properties.inputParameters ?? {}) ? 'inputs' : 'review'

export const RunWorkflowDialog: React.FC<RunWorkflowDialogProps> = ({
  open,
  onOpenChange,
  item,
  workflow: initialWorkflow,
  source: initialSource,
  savedSet: initialSet,
  outsideDataFinder = false,
}) => {
  const searchCollection = useSelector(dataFinderStore, (state) => state.context.collection)

  const initialDetail = initialWorkflow && isFullRecord(initialWorkflow) ? initialWorkflow : null
  const firstStep = (): Step => {
    if (!initialWorkflow) return 'workflow'
    return initialDetail ? stepFor(initialDetail) : 'loading'
  }
  const [step, setStep] = useState<Step>(firstStep)
  const [showedWorkflowStep, setShowedWorkflowStep] = useState(!initialWorkflow)
  const [workflows, setWorkflows] = useState<ProcessRecord[]>([])
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false)
  const [workflowsError, setWorkflowsError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialWorkflow?.id ?? null)
  /** The workflow chosen in the workflow step, in place of the one the dialog opened with. */
  const [pickedWorkflow, setPickedWorkflow] = useState<ProcessRecord | null>(null)
  /** The next step waits for the workflow to load. */
  const [awaitingDetail, setAwaitingDetail] = useState(!!initialWorkflow && !initialDetail)

  const run = useWorkflowRun({
    workflow: pickedWorkflow ?? initialWorkflow ?? null,
    item,
    source: initialSource,
    savedSet: initialSet,
    outsideDataFinder,
    enabled: open,
    choosingSource: step === 'source',
  })
  const { detail, workflowTitle, isLoadingDetail, detailError, source, isSingleItem } = run

  const workflowsRequestedRef = useRef(false)

  // Start fresh every time the dialog opens
  useEffect(() => {
    workflowsRequestedRef.current = false
    setPickedWorkflow(null)
    if (!open) return
    setStep(firstStep())
    setShowedWorkflowStep(!initialWorkflow)
    setSelectedId(initialWorkflow?.id ?? null)
    setAwaitingDetail(!!initialWorkflow && !initialDetail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Move on once the chosen workflow has loaded
  useEffect(() => {
    if (awaitingDetail && detail) {
      setAwaitingDetail(false)
      setStep(stepFor(detail))
    }
  }, [awaitingDetail, detail])

  const loadWorkflows = async () => {
    setIsLoadingWorkflows(true)
    setWorkflowsError(null)
    // Only the first 100 workflows are fetched, because the list is filtered by dataset in the browser
    const { data, error } = await fetchItems({ type: 'workflow', page: 1, pageSize: 100 })
    setIsLoadingWorkflows(false)
    if (error) {
      setWorkflowsError(error)
      setWorkflows([])
      return
    }
    setWorkflows(data?.items ?? [])
  }

  // The workflow list loads the first time the workflow step shows in each opening
  useEffect(() => {
    if (open && step === 'workflow' && !workflowsRequestedRef.current) {
      workflowsRequestedRef.current = true
      void loadWorkflows()
    }
  }, [open, step])

  // Workflows are filtered by dataset when every item comes from one dataset
  const datasetFilter =
    source === 'item'
      ? { collection: item?.collection }
      : source === 'results'
        ? { collection: searchCollection?.id }
        : null
  const listedWorkflows = datasetFilter
    ? workflows.filter((w) => toolAppliesTo(w, datasetFilter.collection))
    : workflows

  const showWorkflowStep = () => {
    setShowedWorkflowStep(true)
    if (selectedId && !listedWorkflows.some((w) => w.id === selectedId) && workflows.length > 0) {
      setSelectedId(null)
    }
    setStep('workflow')
  }

  const chooseWorkflow = () => {
    if (!selectedId) return
    if (detail?.id === selectedId) {
      setStep(stepFor(detail))
      return
    }
    const current = pickedWorkflow ?? initialWorkflow
    if (current?.id === selectedId) {
      run.reloadWorkflow()
    } else {
      const record = workflows.find((w) => w.id === selectedId)
      if (!record) return
      setPickedWorkflow(record)
    }
    setAwaitingDetail(true)
  }

  const beforeInputs = (): Step | null => (showedWorkflowStep ? 'workflow' : null)

  const beforeReview = () => (run.hasInputsToSet ? 'inputs' : beforeInputs())

  const goBack = (to: Step | null) => {
    run.clearLaunchError()
    if (to) setStep(to)
    else onOpenChange(false)
  }

  const startRun = async () => {
    if (await run.run()) setStep('started')
  }

  const changeSourceButton = (
    <Button variant="soft" color="gray" onClick={() => goBack('source')}>
      Change source
    </Button>
  )

  const backButton = (to: Step | null) => (
    <Button variant="soft" color="gray" onClick={() => goBack(to)}>
      {to ? 'Back' : 'Cancel'}
    </Button>
  )

  const singleJobId = run.singleJobStarted ? run.startedJobs[0].jobId : null
  const outputsLink = detail
    ? `/my-data/workflow-outputs?workflow=${encodeURIComponent(detail.id)}`
    : '/my-data/workflow-outputs'

  const title =
    step === 'started' && run.failedJobs.length > 0 ? 'Some jobs did not start' : STEP_TITLES[step]

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="640px">
        <Dialog.Title mb="1">{title}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="3">
          {step === 'source' && 'The workflow runs once on each item.'}
          {step === 'workflow' && `Running on ${run.sourceText()}.`}
          {(step === 'inputs' || step === 'review') && (
            <>
              <strong>{workflowTitle}</strong> · running on {run.sourceText()}
            </>
          )}
          {step === 'started' &&
            (isSingleItem
              ? `${workflowTitle} has started. It may take a while to finish.`
              : `${workflowTitle} on ${run.sourceText()}. Jobs may take a while to finish.`)}
        </Dialog.Description>

        {step === 'source' && (
          <Flex direction="column" gap="3">
            <RunSourceChoices run={run} />
            <Flex justify="between" gap="3" mt="2">
              {backButton(null)}
              <Button disabled={!run.sourceReady} onClick={showWorkflowStep}>
                Next
              </Button>
            </Flex>
          </Flex>
        )}

        {step === 'loading' && (
          <Flex direction="column" gap="3">
            {isLoadingDetail && <LoadingIndicator size="2" />}
            {detailError && (
              <Flex direction="column" gap="2">
                <Text size="2" color="red">
                  {detailError}
                </Text>
                {initialWorkflow && (
                  <Button variant="soft" size="2" onClick={run.reloadWorkflow}>
                    Retry
                  </Button>
                )}
              </Flex>
            )}
            <Flex justify="start" gap="3" mt="2">
              {backButton(null)}
            </Flex>
          </Flex>
        )}

        {step === 'workflow' && (
          <Flex direction="column" gap="3">
            {isLoadingWorkflows && <LoadingIndicator size="2" />}
            {workflowsError && (
              <Flex direction="column" gap="2">
                <Text size="2" color="red">
                  Unable to load workflows: {workflowsError}
                </Text>
                <Button variant="soft" size="2" onClick={() => void loadWorkflows()}>
                  Retry
                </Button>
              </Flex>
            )}
            {!isLoadingWorkflows && !workflowsError && listedWorkflows.length === 0 && (
              <Text size="2" color="gray">
                {datasetFilter
                  ? 'No workflows are available for this dataset.'
                  : 'No workflows are available.'}
              </Text>
            )}
            <Flex direction="column" gap="2" className={styles.workflowList}>
              {listedWorkflows.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={w.id === selectedId}
                  disabled={isLoadingDetail}
                  className={`${styles.workflowOption} ${w.id === selectedId ? styles.workflowOptionSelected : ''}`}
                  onClick={() => setSelectedId(w.id)}
                >
                  <Flex direction="column" gap="1" align="start">
                    <Text weight="bold">{w.properties.title ?? w.id}</Text>
                    {w.properties.description && (
                      <Text size="2" color="gray">
                        {w.properties.description}
                      </Text>
                    )}
                  </Flex>
                </button>
              ))}
            </Flex>
            {detailError && (
              <Text size="2" color="red">
                {detailError}
              </Text>
            )}
            <Flex justify="between" gap="3" mt="2">
              {changeSourceButton}
              <Flex gap="3">
                {backButton(null)}
                <Button disabled={!selectedId || isLoadingDetail} onClick={chooseWorkflow}>
                  {isLoadingDetail ? 'Loading…' : 'Next'}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        )}

        {step === 'inputs' && detail && (
          <Flex direction="column" gap="4">
            <RunInputs run={run} />
            <Flex justify="between" gap="3" mt="2">
              {changeSourceButton}
              <Flex gap="3">
                {backButton(beforeInputs())}
                <Button
                  disabled={run.missingRequiredArea || run.halfFilledRange}
                  onClick={() => setStep('review')}
                >
                  Next
                </Button>
              </Flex>
            </Flex>
          </Flex>
        )}

        {step === 'review' && detail && (
          <Flex direction="column" gap="4">
            <RunReview
              run={run}
              itemWithoutLinkHint="Close this dialog and choose a different item."
            />
            <Flex justify="between" gap="3" mt="2">
              {changeSourceButton}
              <Flex gap="3">
                {backButton(beforeReview())}
                <Button disabled={!run.canRun} onClick={() => void startRun()}>
                  {run.isLaunching ? 'Running…' : 'Run workflow'}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        )}

        {step === 'started' && (
          <RunStarted
            run={run}
            actions={
              <>
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Close
                  </Button>
                </Dialog.Close>
                <Button asChild>
                  <Link
                    to={
                      run.singleJobStarted && singleJobId
                        ? `/my-data/workflow-outputs/${run.workspace}/${singleJobId}`
                        : outputsLink
                    }
                    onClick={() => onOpenChange(false)}
                  >
                    {run.singleJobStarted ? 'View job' : 'View in Workflow outputs'}
                  </Link>
                </Button>
              </>
            }
          />
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
