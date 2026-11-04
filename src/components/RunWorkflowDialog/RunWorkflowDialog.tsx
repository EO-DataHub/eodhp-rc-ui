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
} from '@radix-ui/themes'
import { CheckCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import type { InputParameterEntry, Item, ProcessDetail, ProcessRecord } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import {
  buildWorkflowVariables,
  getHubInputKind,
  type WorkflowLaunchContext,
} from '@/services/workflowVariableResolvers'
import { getHubApiOrigin, getWorkflowExecutionUrl, toolAppliesTo } from '@/library/integrationTools'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import styles from './RunWorkflowDialog.module.scss'

type Step = 'loading' | 'workflow' | 'inputs' | 'review' | 'started'

const STEP_TITLES: Record<Step, string> = {
  loading: 'Run workflow',
  workflow: 'Choose a workflow',
  inputs: 'Check the inputs',
  review: 'Review and run',
  started: 'Workflow started',
}

type UserValues = Record<string, string>

interface RunWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The item to run on. */
  item?: Item
  /** The workflow to run. When set, the workflow step is skipped. A list record is loaded in full on open. */
  workflow?: ProcessRecord
}

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
}) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  const initialDetail = initialWorkflow && isFullRecord(initialWorkflow) ? initialWorkflow : null
  const firstStep = (): Step => {
    if (!initialWorkflow) return 'workflow'
    return initialDetail ? stepFor(initialDetail) : 'loading'
  }
  const [step, setStep] = useState<Step>(firstStep)
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
  const [jobId, setJobId] = useState<string | null>(null)

  const inputs = useMemo(() => detail?.properties.inputParameters ?? {}, [detail])
  const needsInputs = needsInputsStep(inputs)

  // Changes on every open and close, so a details request from an earlier opening is ignored
  const openingRef = useRef(0)

  // Start fresh every time the dialog opens
  useEffect(() => {
    openingRef.current += 1
    if (!open) return
    setStep(firstStep())
    setSelectedId(initialWorkflow?.id ?? null)
    setDetail(initialDetail)
    setIsLoadingDetail(false)
    setDetailError(null)
    setValues(initialUserValues(initialDetail?.properties.inputParameters ?? {}))
    setIncludeAoi(!!aoi)
    setLaunchError(null)
    setJobId(null)
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

  useEffect(() => {
    if (open && !initialWorkflow) void loadWorkflows()
  }, [open, initialWorkflow])

  const listedWorkflows = workflows.filter((w) => toolAppliesTo(w, item?.collection))
  const workflowTitle = detail?.properties.title ?? detail?.id ?? ''

  const areaText = () => {
    if (!aoi) return 'No area drawn on the map'
    return includeAoi ? 'The area drawn on the map' : 'Not included'
  }

  const launchContext: WorkflowLaunchContext | null = item
    ? { item, aoi, includeAoi, workspace: currentWorkspace, apiBaseUrl: getHubApiOrigin() }
    : null

  const resolvedHubValues = launchContext ? buildWorkflowVariables(inputs, launchContext) : {}

  /** Item inputs the Hub cannot fill, for example when the item has no self link. */
  const missingItemInputs = Object.entries(inputs).filter(
    ([key, def]) => getHubInputKind(key, def) === 'item' && !resolvedHubValues[key],
  )

  const hubValueText = (key: string, def: InputParameterEntry) => {
    switch (getHubInputKind(key, def)) {
      case 'item':
        return item && resolvedHubValues[key] ? `Item ${item.id}` : 'Not available'
      case 'area':
        return areaText()
      default:
        return resolvedHubValues[key] ?? 'Not available'
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

  const chooseWorkflow = async () => {
    if (!selectedId) return
    if (detail?.id !== selectedId) {
      await loadDetail(selectedId)
      return
    }
    setStep(needsInputs ? 'inputs' : 'review')
  }

  const beforeInputs = (): Step | null => (initialWorkflow ? null : 'workflow')

  const beforeReview = () => (needsInputs ? 'inputs' : beforeInputs())

  const goBack = (to: Step | null) => {
    setLaunchError(null)
    if (to) setStep(to)
    else onOpenChange(false)
  }

  const run = async () => {
    if (!detail || !launchContext || !token || !currentWorkspace) return
    if (missingItemInputs.length > 0) return

    const executionUrl = getWorkflowExecutionUrl(detail)
    if (!executionUrl) {
      setLaunchError('Workflow execution URL not found. Please contact support.')
      return
    }

    setIsLaunching(true)
    setLaunchError(null)
    try {
      const variables = {
        ...resolvedHubValues,
        ...toLaunchValues(inputs, values),
      }
      const { access } = await fetchWorkspaceTokens(currentWorkspace, token)
      const response = await launchWorkflow(executionUrl, variables, access)
      setJobId(response.workflowId?.trim() || null)
      setStep('started')
    } catch (err) {
      setLaunchError(
        err instanceof Error ? err.message : 'Failed to launch workflow. Please try again.',
      )
    } finally {
      setIsLaunching(false)
    }
  }

  const backButton = (to: Step | null) => (
    <Button variant="soft" color="gray" onClick={() => goBack(to)}>
      {to ? 'Back' : 'Cancel'}
    </Button>
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="640px">
        <Dialog.Title mb="1">{STEP_TITLES[step]}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="3">
          {step === 'workflow' && item && `Running on item ${item.id}.`}
          {(step === 'inputs' || step === 'review') && item && (
            <>
              <strong>{workflowTitle}</strong> · running on item {item.id}
            </>
          )}
          {step === 'started' && `${workflowTitle} has started. It may take a while to finish.`}
        </Dialog.Description>

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
                No workflows are available for this dataset.
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
              {backButton(null)}
              <Button
                disabled={!selectedId || isLoadingDetail}
                onClick={() => void chooseWorkflow()}
              >
                {isLoadingDetail ? 'Loading…' : 'Next'}
              </Button>
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
              <DataList.Item>
                <DataList.Label>Item</DataList.Label>
                <DataList.Value>{item?.id}</DataList.Value>
              </DataList.Item>
              {Object.entries(inputs).map(([key, def]) => (
                <DataList.Item key={key}>
                  <DataList.Label>{inputLabel(key, def)}</DataList.Label>
                  <DataList.Value>{inputValueText(key, def)}</DataList.Value>
                </DataList.Item>
              ))}
              <DataList.Item>
                <DataList.Label>Workspace</DataList.Label>
                <DataList.Value>
                  {currentWorkspace ? `${currentWorkspace} (the job runs here)` : 'None'}
                </DataList.Value>
              </DataList.Item>
            </DataList.Root>

            {!currentWorkspace && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>Select a workspace to run this workflow.</Callout.Text>
              </Callout.Root>
            )}
            {missingItemInputs.length > 0 && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  The Hub cannot fill in{' '}
                  {missingItemInputs.map(([key, def]) => inputLabel(key, def)).join(', ')} because
                  this item has no link. Close this dialog and choose a different item.
                </Callout.Text>
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
                  !item ||
                  missingItemInputs.length > 0 ||
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
            <Callout.Root color="green">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                You can follow the job in <strong>My data → Workflow outputs</strong>.
              </Callout.Text>
            </Callout.Root>
            <Flex justify="end" gap="3">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
              <Button asChild>
                <Link
                  to={
                    jobId
                      ? `/my-data/workflow-outputs/${currentWorkspace}/${jobId}`
                      : '/my-data/workflow-outputs'
                  }
                  onClick={() => onOpenChange(false)}
                >
                  View job
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
