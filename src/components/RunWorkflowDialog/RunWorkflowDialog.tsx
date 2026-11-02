import React, { useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import {
  Button,
  Callout,
  Checkbox,
  DataList,
  Dialog,
  Flex,
  Text,
  TextField,
  VisuallyHidden,
} from '@radix-ui/themes'
import { CheckCircledIcon, CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import type { InputParameterEntry, Item, ProcessDetail, ProcessRecord } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import type { SavedSet } from '@/services/savedSetsService'
import {
  buildWorkflowVariables,
  getHubInputKind,
  type LaunchItem,
  type WorkflowLaunchContext,
} from '@/services/workflowVariableResolvers'
import {
  getHubApiOrigin,
  getSelfLinkHref,
  getWorkflowExecutionUrl,
  toolAppliesTo,
} from '@/library/integrationTools'
import {
  savedSetLaunchItems,
  submitJobs,
  type FailedJob,
  type FanOutResult,
  type StartedJob,
} from '@/library/workflowFanOut'
import { useSearchResultsQuery } from '@/hooks/useItemsQuery'
import { useSavedSet, useSavedSets } from '@/hooks/useSavedSets'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import styles from './RunWorkflowDialog.module.scss'

type Step = 'source' | 'loading' | 'workflow' | 'inputs' | 'review' | 'started'

/** What the workflow runs on. Each item in the source gets its own job. */
export type RunSource = 'item' | 'pinned' | 'set' | 'results'

const STEP_TITLES: Record<Step, string> = {
  source: 'What do you want to run on?',
  loading: 'Run workflow',
  workflow: 'Choose a workflow',
  inputs: 'Check the inputs',
  review: 'Review and run',
  started: 'Workflow started',
}

const SOURCE_LABELS: Record<RunSource, string> = {
  item: 'This item',
  pinned: 'Pinned items',
  set: 'Saved set',
  results: 'All results',
}

const SOURCES: RunSource[] = ['item', 'pinned', 'set', 'results']

type UserValues = Record<string, string>

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
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const inputLabel = (key: string, def: InputParameterEntry) => def.label ?? key

const getDefaultValue = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''

const getUserInputs = (inputs: Record<string, InputParameterEntry>) =>
  Object.entries(inputs).filter(([key, def]) => !getHubInputKind(key, def))

const hasAreaInput = (inputs: Record<string, InputParameterEntry>) =>
  Object.entries(inputs).some(([key, def]) => getHubInputKind(key, def) === 'area')

/** The inputs step is shown when the user has fields to fill in or an area to include. */
const needsInputsStep = (inputs: Record<string, InputParameterEntry>) =>
  getUserInputs(inputs).length > 0 || hasAreaInput(inputs)

const initialUserValues = (inputs: Record<string, InputParameterEntry>): UserValues =>
  Object.fromEntries(getUserInputs(inputs).map(([key, def]) => [key, getDefaultValue(def.default)]))

const toLaunchValues = (inputs: Record<string, InputParameterEntry>, values: UserValues) =>
  Object.fromEntries(
    getUserInputs(inputs).map(([key, def]): [string, string | number | boolean] => {
      const value = values[key] ?? ''
      if (def.type === 'number') {
        const n = Number(value)
        return [key, value !== '' && !Number.isNaN(n) ? n : value]
      }
      if (def.type === 'boolean') return [key, value === 'true' || value === '1']
      return [key, value]
    }),
  )

/** List records leave out links, so they cannot be run until the full record is loaded. */
const isFullRecord = (workflow: ProcessRecord): workflow is ProcessDetail =>
  !!(workflow as ProcessDetail).links

const stepFor = (workflow: ProcessDetail): Step =>
  needsInputsStep(workflow.properties.inputParameters ?? {}) ? 'inputs' : 'review'

export const RunWorkflowDialog: React.FC<RunWorkflowDialogProps> = ({
  open,
  onOpenChange,
  item,
  workflow: initialWorkflow,
  source: initialSource,
  savedSet: initialSet,
}) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const idPrefix = useId()
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)
  const searchCollection = useSelector(dataFinderStore, (state) => state.context.collection)

  const startSource: RunSource = initialSource ?? (item ? 'item' : 'pinned')
  const initialDetail = initialWorkflow && isFullRecord(initialWorkflow) ? initialWorkflow : null
  const firstStep = (): Step => {
    if (!initialWorkflow) return 'workflow'
    return initialDetail ? stepFor(initialDetail) : 'loading'
  }
  const [step, setStep] = useState<Step>(firstStep)
  const [source, setSource] = useState<RunSource>(startSource)
  const [setId, setSetId] = useState<string | null>(initialSet?.id ?? null)
  const [showedWorkflowStep, setShowedWorkflowStep] = useState(!initialWorkflow)
  const [workflows, setWorkflows] = useState<ProcessRecord[]>([])
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false)
  const [workflowsError, setWorkflowsError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialWorkflow?.id ?? null)
  const [detail, setDetail] = useState<ProcessDetail | null>(initialDetail)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [values, setValues] = useState<UserValues>({})
  const [includeAoi, setIncludeAoi] = useState(!!aoi)
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [startedJobs, setStartedJobs] = useState<StartedJob[]>([])
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([])

  const inputs = useMemo(() => detail?.properties.inputParameters ?? {}, [detail])
  const needsInputs = needsInputsStep(inputs)

  // Source data is only fetched while it can be chosen or is in use
  const onSourceStep = open && step === 'source'
  const resultsQuery = useSearchResultsQuery(open && (source === 'results' || onSourceStep))
  const setsQuery = useSavedSets(open && (source === 'set' || onSourceStep))
  const setQuery = useSavedSet(
    open && source === 'set' && !!setId && setId !== initialSet?.id ? setId : undefined,
  )

  const chosenSet =
    source === 'set' ? (setId === initialSet?.id ? initialSet : setQuery.data) : null
  const chosenSetName =
    setId === initialSet?.id
      ? initialSet?.name
      : setsQuery.data?.find((summary) => summary.id === setId)?.name
  const results =
    resultsQuery.isSuccess && !resultsQuery.isPlaceholderData ? resultsQuery.data : undefined

  /** The items to run on, one job each. Undefined while they load. */
  const targets: LaunchItem[] | undefined = useMemo(() => {
    switch (source) {
      case 'item':
        return item ? [item] : []
      case 'pinned':
        return pinnedItems
      case 'set':
        return chosenSet ? savedSetLaunchItems(chosenSet) : undefined
      case 'results':
        return results
    }
  }, [source, item, pinnedItems, chosenSet, results])

  const isSingleItem = source === 'item'

  // Changes on every open and close, so a details request from an earlier opening is ignored
  const openingRef = useRef(0)
  const workflowsRequestedRef = useRef(false)

  // Start fresh every time the dialog opens
  useEffect(() => {
    openingRef.current += 1
    workflowsRequestedRef.current = false
    if (!open) return
    setStep(firstStep())
    setSource(startSource)
    setSetId(initialSet?.id ?? null)
    setShowedWorkflowStep(!initialWorkflow)
    setSelectedId(initialWorkflow?.id ?? null)
    setDetail(initialDetail)
    setIsLoadingDetail(false)
    setDetailError(null)
    setValues(initialUserValues(initialDetail?.properties.inputParameters ?? {}))
    setIncludeAoi(!!aoi)
    setLaunchError(null)
    setStartedJobs([])
    setFailedJobs([])
    if (initialWorkflow && !initialDetail) void loadDetail(initialWorkflow.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setIncludeAoi(!!aoi)
  }, [aoi])

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
  const workflowTitle = detail?.properties.title ?? detail?.id ?? ''

  const sourceText = (): string => {
    const count = targets ? ` (${plural(targets.length, 'item')})` : ''
    switch (source) {
      case 'item':
        return `item ${item?.id ?? ''}`
      case 'pinned':
        return `${plural(pinnedItems.length, 'pinned item')}`
      case 'set':
        return chosenSetName ? `the saved set ${chosenSetName}${count}` : 'a saved set'
      case 'results':
        return `all results of the search${count}`
    }
  }

  const sourceUnavailableReason = (option: RunSource): string | undefined => {
    switch (option) {
      case 'item':
        return item ? undefined : 'Open an item on the map to run on it'
      case 'pinned':
        return pinnedItems.length > 0 ? undefined : 'Pin some items on the map first'
      case 'set':
        if (!token || !currentWorkspace) return 'Select a workspace to use saved sets'
        if (setsQuery.error) return setsQuery.error.message
        return setsQuery.data && setsQuery.data.length === 0 ? 'Save a set first' : undefined
      case 'results':
        if (!searchCollection) return 'Search for items in the Data Finder first'
        return results && results.length === 0 ? 'The search has no results' : undefined
    }
  }

  const canLeaveSourceStep = !sourceUnavailableReason(source) && (source !== 'set' || !!setId)

  const areaText = () => {
    if (!aoi) return 'No area drawn on the map'
    return includeAoi ? 'The area drawn on the map' : 'Not included'
  }

  const contextFor = (target: LaunchItem): WorkflowLaunchContext => ({
    item: target,
    aoi,
    includeAoi,
    workspace: currentWorkspace,
    apiBaseUrl: getHubApiOrigin(),
  })

  const itemInputs = Object.entries(inputs).filter(
    ([key, def]) => getHubInputKind(key, def) === 'item',
  )

  /** Items the Hub cannot fill the item inputs for, because they have no self link. */
  const targetsWithoutLink =
    itemInputs.length > 0 && targets ? targets.filter((target) => !getSelfLinkHref(target)) : []

  const hubValueText = (key: string, def: InputParameterEntry) => {
    switch (getHubInputKind(key, def)) {
      case 'item':
        if (isSingleItem) {
          return item && getSelfLinkHref(item) ? `Item ${item.id}` : 'Not available'
        }
        return 'The link of each item'
      case 'area':
        return areaText()
      default: {
        const resolved = new Set(
          (targets ?? []).map((target) => buildWorkflowVariables(inputs, contextFor(target))[key]),
        )
        if (resolved.size > 1) return 'Set for each item'
        const [value] = Array.from(resolved)
        return value ?? 'Not available'
      }
    }
  }

  const inputValueText = (key: string, def: InputParameterEntry) =>
    getHubInputKind(key, def) ? hubValueText(key, def) : values[key] || 'Not set'

  const loadDetail = async (id: string) => {
    const opening = openingRef.current
    setIsLoadingDetail(true)
    setDetailError(null)
    const { data, error } = await fetchItemById(id)
    if (opening !== openingRef.current) return
    setIsLoadingDetail(false)
    if (error != null || !data) {
      setDetailError(error ?? 'Could not load workflow details. Please try again.')
      return
    }
    setDetail(data)
    setValues(initialUserValues(data.properties.inputParameters ?? {}))
    setStep(stepFor(data))
  }

  const showWorkflowStep = () => {
    setShowedWorkflowStep(true)
    if (selectedId && !listedWorkflows.some((w) => w.id === selectedId) && workflows.length > 0) {
      setSelectedId(null)
    }
    setStep('workflow')
  }

  const chooseWorkflow = async () => {
    if (!selectedId) return
    if (detail?.id !== selectedId) {
      await loadDetail(selectedId)
      return
    }
    setStep(needsInputs ? 'inputs' : 'review')
  }

  const beforeInputs = (): Step | null => (showedWorkflowStep ? 'workflow' : null)

  const beforeReview = () => (needsInputs ? 'inputs' : beforeInputs())

  const goBack = (to: Step | null) => {
    setLaunchError(null)
    if (to) setStep(to)
    else onOpenChange(false)
  }

  /** Starts a job for each item. Returns null when no job could be sent. */
  const submit = async (items: LaunchItem[]): Promise<FanOutResult | null> => {
    if (!detail || !token || !currentWorkspace) return null

    const executionUrl = getWorkflowExecutionUrl(detail)
    if (!executionUrl) {
      setLaunchError('Workflow execution URL not found. Please contact support.')
      return null
    }

    setIsLaunching(true)
    setLaunchError(null)
    try {
      const { access } = await fetchWorkspaceTokens(currentWorkspace, token)
      const userValues = toLaunchValues(inputs, values)
      return await submitJobs(items, (target) =>
        launchWorkflow(
          executionUrl,
          { ...buildWorkflowVariables(inputs, contextFor(target)), ...userValues },
          access,
        ),
      )
    } catch (err) {
      setLaunchError(
        err instanceof Error ? err.message : 'Failed to launch workflow. Please try again.',
      )
      return null
    } finally {
      setIsLaunching(false)
    }
  }

  const run = async () => {
    if (!targets || targets.length === 0 || targetsWithoutLink.length > 0) return
    const result = await submit(targets)
    if (!result) return
    // A single job that fails stays on the review step, so the user can change the inputs
    if (targets.length === 1 && result.failed.length === 1) {
      setLaunchError(result.failed[0].error)
      return
    }
    setStartedJobs(result.started)
    setFailedJobs(result.failed)
    setStep('started')
  }

  const retryFailed = async () => {
    const result = await submit(failedJobs.map((job) => job.item))
    if (!result) return
    setStartedJobs((prev) => [...prev, ...result.started])
    setFailedJobs(result.failed)
  }

  const backButton = (to: Step | null) => (
    <Button variant="soft" color="gray" onClick={() => goBack(to)}>
      {to ? 'Back' : 'Cancel'}
    </Button>
  )

  const singleJobStarted = isSingleItem && startedJobs.length === 1 && failedJobs.length === 0
  const singleJobId = singleJobStarted ? startedJobs[0].jobId : null
  const outputsLink = detail
    ? `/my-data/workflow-outputs?workflow=${encodeURIComponent(detail.id)}`
    : '/my-data/workflow-outputs'

  const title =
    step === 'started' && failedJobs.length > 0 ? 'Some jobs did not start' : STEP_TITLES[step]

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="640px">
        <Dialog.Title mb="1">{title}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="3">
          {step === 'source' && 'The workflow runs once on each item.'}
          {step === 'workflow' && `Running on ${sourceText()}.`}
          {(step === 'inputs' || step === 'review') && (
            <>
              <strong>{workflowTitle}</strong> · running on {sourceText()}
            </>
          )}
          {step === 'started' &&
            (isSingleItem
              ? `${workflowTitle} has started. It may take a while to finish.`
              : `${workflowTitle} on ${sourceText()}. Jobs may take a while to finish.`)}
        </Dialog.Description>

        {step === 'source' && (
          <Flex direction="column" gap="3">
            <fieldset className={styles.sourceList}>
              <VisuallyHidden asChild>
                <legend>Source</legend>
              </VisuallyHidden>
              {SOURCES.map((option) => {
                const reason = sourceUnavailableReason(option)
                const hintId = `${idPrefix}-${option}-hint`
                return (
                  <Flex key={option} direction="column" gap="1">
                    <Text as="label" size="2" className={styles.sourceOption}>
                      <input
                        type="radio"
                        name="run-source"
                        value={option}
                        checked={source === option}
                        disabled={!!reason}
                        aria-describedby={reason ? hintId : undefined}
                        onChange={() => setSource(option)}
                      />
                      {SOURCE_LABELS[option]}
                    </Text>
                    {reason && (
                      <Text id={hintId} size="1" color="gray" className={styles.sourceHint}>
                        {reason}
                      </Text>
                    )}
                    {option === 'set' && source === 'set' && !reason && (
                      <div className={styles.setList}>
                        {setsQuery.isLoading && <LoadingIndicator size="1" />}
                        {setsQuery.data?.map((summary) => (
                          <Text
                            key={summary.id}
                            as="label"
                            size="2"
                            className={styles.sourceOption}
                          >
                            <input
                              type="radio"
                              name="run-source-set"
                              value={summary.id}
                              checked={setId === summary.id}
                              onChange={() => setSetId(summary.id)}
                            />
                            <span>{summary.name}</span>
                            <Text size="1" color="gray">
                              {plural(summary.itemCount, 'item')}
                            </Text>
                          </Text>
                        ))}
                      </div>
                    )}
                  </Flex>
                )
              })}
            </fieldset>
            <Flex justify="between" gap="3" mt="2">
              {backButton(null)}
              <Button disabled={!canLeaveSourceStep} onClick={showWorkflowStep}>
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
                  <Button
                    variant="soft"
                    size="2"
                    onClick={() => void loadDetail(initialWorkflow.id)}
                  >
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
              <Button variant="soft" color="gray" onClick={() => setStep('source')}>
                Change source
              </Button>
              <Flex gap="3">
                {backButton(null)}
                <Button
                  disabled={!selectedId || isLoadingDetail}
                  onClick={() => void chooseWorkflow()}
                >
                  {isLoadingDetail ? 'Loading…' : 'Next'}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        )}

        {step === 'inputs' && detail && (
          <Flex direction="column" gap="4">
            <InputsForm
              inputs={inputs}
              values={values}
              onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
              hubValueText={hubValueText}
              hasArea={!!aoi}
              includeAoi={includeAoi}
              onIncludeAoiChange={setIncludeAoi}
            />
            <Flex justify="between" gap="3" mt="2">
              {backButton(beforeInputs())}
              <Button onClick={() => setStep('review')}>Next</Button>
            </Flex>
          </Flex>
        )}

        {step === 'review' && detail && (
          <Flex direction="column" gap="4">
            <DataList.Root>
              <DataList.Item>
                <DataList.Label>Workflow</DataList.Label>
                <DataList.Value>{workflowTitle}</DataList.Value>
              </DataList.Item>
              {isSingleItem ? (
                <DataList.Item>
                  <DataList.Label>Item</DataList.Label>
                  <DataList.Value>{item?.id}</DataList.Value>
                </DataList.Item>
              ) : (
                <DataList.Item>
                  <DataList.Label>Run on</DataList.Label>
                  <DataList.Value>{SOURCE_LABELS[source]}</DataList.Value>
                </DataList.Item>
              )}
              {Object.entries(inputs).map(([key, def]) => (
                <DataList.Item key={key}>
                  <DataList.Label>{inputLabel(key, def)}</DataList.Label>
                  <DataList.Value>{inputValueText(key, def)}</DataList.Value>
                </DataList.Item>
              ))}
              <DataList.Item>
                <DataList.Label>Workspace</DataList.Label>
                <DataList.Value>
                  {currentWorkspace
                    ? `${currentWorkspace} (${isSingleItem ? 'the job runs' : 'the jobs run'} here)`
                    : 'None'}
                </DataList.Value>
              </DataList.Item>
            </DataList.Root>

            {!isSingleItem &&
              (targets ? (
                <Text size="2">
                  This starts <strong>{plural(targets.length, 'job')}</strong>, one for each item.
                </Text>
              ) : (
                <Flex gap="2" align="center">
                  <LoadingIndicator size="1" />
                  <Text size="2">Loading the items…</Text>
                </Flex>
              ))}

            {!currentWorkspace && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>Select a workspace to run this workflow.</Callout.Text>
              </Callout.Root>
            )}
            {targetsWithoutLink.length > 0 && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  The Hub cannot fill in{' '}
                  {itemInputs.map(([key, def]) => inputLabel(key, def)).join(', ')} because{' '}
                  {isSingleItem
                    ? 'this item has no link. Close this dialog and choose a different item.'
                    : `${plural(targetsWithoutLink.length, 'item')} ${targetsWithoutLink.length === 1 ? 'has' : 'have'} no link: ${targetsWithoutLink.map((target) => target.id).join(', ')}.`}
                </Callout.Text>
              </Callout.Root>
            )}
            {targets?.length === 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Text>There are no items to run on.</Callout.Text>
              </Callout.Root>
            )}
            {launchError && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{launchError}</Callout.Text>
              </Callout.Root>
            )}

            <Flex justify="between" gap="3" mt="2">
              {backButton(beforeReview())}
              <Button
                disabled={
                  !currentWorkspace ||
                  !token ||
                  !targets ||
                  targets.length === 0 ||
                  targetsWithoutLink.length > 0 ||
                  isLaunching
                }
                onClick={() => void run()}
              >
                {isLaunching ? 'Running…' : 'Run workflow'}
              </Button>
            </Flex>
          </Flex>
        )}

        {step === 'started' && (
          <Flex direction="column" gap="4">
            {singleJobStarted ? (
              <Callout.Root color="green">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  You can follow the job in <strong>My data → Workflow outputs</strong>.
                </Callout.Text>
              </Callout.Root>
            ) : (
              <>
                {startedJobs.length > 0 && (
                  <Callout.Root color="green">
                    <Callout.Icon>
                      <CheckCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      <strong>{`${plural(startedJobs.length, 'job')} started`}</strong>. You can
                      follow them in <strong>My data → Workflow outputs</strong>.
                    </Callout.Text>
                  </Callout.Root>
                )}
                {failedJobs.length > 0 && (
                  <Callout.Root color="red">
                    <Callout.Icon>
                      <CrossCircledIcon />
                    </Callout.Icon>
                    <Flex direction="column" gap="2">
                      <Callout.Text>
                        <strong>{`${failedJobs.length} failed to start:`}</strong>
                      </Callout.Text>
                      <ul className={styles.failedList}>
                        {failedJobs.map(({ item: failedItem, error }) => (
                          <li key={failedItem.id}>
                            <Text size="2">
                              <strong>{failedItem.id}</strong>: {error}
                            </Text>
                          </li>
                        ))}
                      </ul>
                    </Flex>
                  </Callout.Root>
                )}
                {launchError && (
                  <Callout.Root color="red" size="1">
                    <Callout.Text>{launchError}</Callout.Text>
                  </Callout.Root>
                )}
              </>
            )}
            <Flex justify="end" gap="3">
              {failedJobs.length > 0 && (
                <Button
                  variant="soft"
                  color="red"
                  disabled={isLaunching}
                  onClick={() => void retryFailed()}
                >
                  {isLaunching ? 'Retrying…' : 'Retry these'}
                </Button>
              )}
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
              <Button asChild>
                <Link
                  to={
                    singleJobStarted && singleJobId
                      ? `/my-data/workflow-outputs/${currentWorkspace}/${singleJobId}`
                      : outputsLink
                  }
                  onClick={() => onOpenChange(false)}
                >
                  {singleJobStarted ? 'View job' : 'View in Workflow outputs'}
                </Link>
              </Button>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}

interface InputsFormProps {
  inputs: Record<string, InputParameterEntry>
  values: UserValues
  onChange: (key: string, value: string) => void
  hubValueText: (key: string, def: InputParameterEntry) => string
  hasArea: boolean
  includeAoi: boolean
  onIncludeAoiChange: (include: boolean) => void
}

const InputsForm: React.FC<InputsFormProps> = ({
  inputs,
  values,
  onChange,
  hubValueText,
  hasArea,
  includeAoi,
  onIncludeAoiChange,
}) => {
  const idPrefix = useId()
  const hubInputs = Object.entries(inputs).filter(([key, def]) => getHubInputKind(key, def))
  const userInputs = getUserInputs(inputs)

  return (
    <Flex direction="column" gap="4">
      {hubInputs.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Filled in by the Hub
          </Text>
          <DataList.Root>
            {hubInputs.map(([key, def]) => (
              <DataList.Item key={key}>
                <DataList.Label>{inputLabel(key, def)}</DataList.Label>
                <DataList.Value>{hubValueText(key, def)}</DataList.Value>
              </DataList.Item>
            ))}
          </DataList.Root>
        </Flex>
      )}

      {hasAreaInput(inputs) && (
        <Flex direction="column" gap="1">
          <Text as="label" size="2">
            <Flex gap="2" align="center">
              <Checkbox
                checked={hasArea && includeAoi}
                disabled={!hasArea}
                onCheckedChange={(checked) => onIncludeAoiChange(checked === true)}
              />
              Include area of interest
            </Flex>
          </Text>
          {!hasArea && (
            <Text size="1" color="gray">
              Draw an area on the map to include it.
            </Text>
          )}
        </Flex>
      )}

      {userInputs.map(([key, def]) => {
        const id = `${idPrefix}-${key}`
        return (
          <div key={key} className={styles.formField}>
            <Text as="label" htmlFor={id} size="2" weight="medium">
              {inputLabel(key, def)}
            </Text>
            {def.description && (
              <Text size="1" color="gray">
                {def.description}
              </Text>
            )}
            <TextField.Root
              id={id}
              type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
              value={values[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
              size="2"
            />
          </div>
        )
      })}
    </Flex>
  )
}
