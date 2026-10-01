import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import {
  Badge,
  Button,
  Callout,
  DataList,
  Dialog,
  Flex,
  RadioCards,
  Select,
  Text,
} from '@radix-ui/themes'
import { CheckCircledIcon, CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import demoStore from '../demoStore'
import type { RunBatch, RunScope, WorkflowInput } from '../demoTypes'
import { SCOPE_LABELS, jobCount, primaryDataInput } from '../hubTypes'
import { DEMO_CREDIT_BALANCE, MAX_RUN_ITEMS } from '../mockData'
import {
  scopeItemIds,
  scopeOptions as buildScopeOptions,
  visibleWorkflows,
  workflowSupport as supportFor,
} from '../runScopes'
import type { RunContext } from '../useRunContext'
import { DemoBadge } from './DemoBadge'
import { LaunchInputs } from './LaunchInputs'
import { initialUserValues, type HubValue, type UserValues } from '../launchValues'
import styles from './demo.module.scss'

type Step = 'scope' | 'workflow' | 'inputs' | 'review' | 'started'

const STEP_TITLES: Record<Step, string> = {
  scope: 'What do you want to run on?',
  workflow: 'Choose a workflow',
  inputs: 'Check the inputs',
  review: 'Review and run',
  started: 'Run started',
}

interface RunWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: RunContext
  initialScope?: RunScope
  initialSetId?: string
  /** Set when arriving from a workflow share link, or from the Workflows tab. */
  initialWorkflowId?: string
  /** Skip straight to the inputs, when the workflow and data were chosen elsewhere. */
  startAtInputs?: boolean
}

export const RunWorkflowDialog = ({
  open,
  onOpenChange,
  context,
  initialScope,
  initialSetId,
  initialWorkflowId,
  startAtInputs = false,
}: RunWorkflowDialogProps) => {
  const navigate = useNavigate()
  const sets = useSelector(demoStore, ({ context: c }) => c.sets)
  const workspaceWorkflows = useSelector(demoStore, ({ context: c }) => c.workspaceWorkflows)
  const workflows = useMemo(
    () => visibleWorkflows(workspaceWorkflows, context.workspace, initialWorkflowId),
    [workspaceWorkflows, context.workspace, initialWorkflowId],
  )

  const [step, setStep] = useState<Step>('scope')
  const [scope, setScope] = useState<RunScope | undefined>(initialScope)
  const [setId, setSetId] = useState<string | undefined>(initialSetId)
  const [workflowId, setWorkflowId] = useState<string | undefined>(initialWorkflowId)
  const [values, setValues] = useState<UserValues>({})

  // Start fresh every time the dialog opens.
  useEffect(() => {
    if (!open) return
    setStep(startAtInputs ? 'inputs' : 'scope')
    setScope(initialScope)
    setSetId(initialSetId ?? sets[0]?.id)
    setWorkflowId(initialWorkflowId)
    const initialWorkflow = workflows.find((w) => w.id === initialWorkflowId)
    setValues(initialWorkflow ? initialUserValues(initialWorkflow.inputs) : {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectedSet = sets.find((s) => s.id === setId)
  const itemIds = scopeItemIds(scope, context, selectedSet)
  const itemCount = itemIds.length
  const workflow = workflows.find((w) => w.id === workflowId)
  const scopeOptions = buildScopeOptions(context, sets)
  const workflowSupport = (w: (typeof workflows)[number]) =>
    supportFor(w, scope, itemCount, context.collectionId)

  const sourceName = () => {
    switch (scope) {
      case 'pinned':
        return 'your pinned items'
      case 'set':
        return `saved set '${selectedSet?.name ?? ''}'`
      case 'results':
        return 'your search results'
      default:
        return 'this item'
    }
  }

  const hubValue = (input: WorkflowInput): HubValue => {
    if (input.source.kind !== 'hub') return { text: '' }
    switch (input.source.hubType) {
      case 'stac-item':
        return {
          text:
            itemCount === 1
              ? `Item ${itemIds[0]}`
              : `Each of the ${itemCount} items from ${sourceName()}, one run per item`,
        }
      case 'stac-items':
        return { text: `All ${itemCount} items from ${sourceName()}, in one run` }
      case 'stac-search':
        return {
          text: `Your current search on ${context.collectionTitle ?? 'this dataset'}, including your area and filters (up to ${MAX_RUN_ITEMS} items)`,
        }
      case 'aoi':
      case 'bbox':
        if (context.hasAoi) {
          return {
            text:
              input.source.hubType === 'aoi'
                ? 'The area you drew on the map'
                : 'The extent of the area you drew on the map',
          }
        }
        return input.optional
          ? { text: 'No area drawn, so the whole image is used' }
          : { text: 'Draw an area on the map before running this workflow', missing: true }
      case 'date':
      case 'date-range':
        return { text: 'The dates in your search filters, if set' }
      default:
        return { text: '' }
    }
  }

  const hasMissingInputs = workflow?.inputs.some((i) => hubValue(i).missing) ?? false
  const jobs = workflow ? jobCount(workflow, itemCount) : 0
  const credits = workflow ? workflow.creditsPerItem * itemCount : 0
  const dataInput = workflow ? primaryDataInput(workflow.inputs) : undefined
  const stagesIn = dataInput?.cwlType.startsWith('Directory') ?? false

  const scopeLabel = () => {
    switch (scope) {
      case 'item':
        return `item ${itemIds[0]}`
      case 'pinned':
        return `${itemCount} pinned items`
      case 'set':
        return `${itemCount} items from saved set '${selectedSet?.name ?? ''}'`
      case 'results':
        return `${itemCount} search results`
      default:
        return ''
    }
  }

  const startRun = () => {
    if (!workflow) return
    const runId = `run-${Date.now()}`
    const labels = jobs === itemCount ? itemIds : [`${itemCount} items`]
    const run: RunBatch = {
      id: runId,
      workflowId: workflow.id,
      workflowTitle: workflow.title,
      scopeLabel: scopeLabel(),
      workspace: context.workspace,
      startedAt: Date.now(),
      credits,
      jobs: labels.map((label, index) => ({
        id: `${runId}-${index}`,
        label,
        durationMs: 15_000 + ((index * 7919) % 30_000),
        // One failure in larger batches shows what a partial failure looks like.
        fails: labels.length >= 5 && index === 3,
      })),
    }
    demoStore.send({ type: 'startRun', run })
    setStep('started')
  }

  const selectWorkflow = (id: string) => {
    setWorkflowId(id)
    const next = workflows.find((w) => w.id === id)
    if (next) setValues(initialUserValues(next.inputs))
  }

  const goToInputs = () => {
    if (workflow) setValues(initialUserValues(workflow.inputs))
    setStep('inputs')
  }

  const afterScope = () => {
    // Arriving from a share link, the workflow is already chosen.
    if (workflow && workflowSupport(workflow).supported) goToInputs()
    else setStep('workflow')
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="640px">
        <Flex justify="between" align="start" gap="3">
          <Dialog.Title mb="1">{STEP_TITLES[step]}</Dialog.Title>
          <DemoBadge />
        </Flex>
        {initialWorkflowId && workflow && step === 'scope' && (
          <Dialog.Description size="2" color="gray" mb="3">
            Choose the data to run <strong>{workflow.title}</strong> on.
          </Dialog.Description>
        )}

        {step === 'scope' && (
          <Flex direction="column" gap="3" mt="3">
            <RadioCards.Root
              columns="1"
              value={scope}
              onValueChange={(value) => setScope(value as RunScope)}
            >
              {scopeOptions.map((option) => (
                <RadioCards.Item
                  key={option.scope}
                  value={option.scope}
                  disabled={!!option.disabledReason}
                >
                  <Flex direction="column" width="100%" gap="1">
                    <Text weight="bold">{SCOPE_LABELS[option.scope]}</Text>
                    <Text size="2" color="gray">
                      {option.disabledReason ?? option.detail}
                    </Text>
                  </Flex>
                </RadioCards.Item>
              ))}
            </RadioCards.Root>

            {scope === 'set' && sets.length > 0 && (
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Saved set
                </Text>
                <Select.Root value={setId} onValueChange={setSetId}>
                  <Select.Trigger />
                  <Select.Content>
                    {sets.map((s) => (
                      <Select.Item key={s.id} value={s.id}>
                        {s.name} ({s.items.length} items)
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            )}

            <Flex justify="end" gap="3" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button disabled={!scope || itemCount === 0} onClick={afterScope}>
                Next
              </Button>
            </Flex>
          </Flex>
        )}

        {step === 'workflow' && (
          <Flex direction="column" gap="3" mt="3">
            <Text size="2" color="gray">
              Running on {scopeLabel()}. Workflows that can&apos;t handle this are greyed out.
            </Text>
            <Flex direction="column" gap="2" className={styles.workflowList}>
              {workflows.map((w) => {
                const support = workflowSupport(w)
                const selected = w.id === workflowId
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={`${styles.workflowOption} ${selected ? styles.workflowOptionSelected : ''}`}
                    disabled={!support.supported}
                    onClick={() => selectWorkflow(w.id)}
                  >
                    <Flex direction="column" gap="1" align="start">
                      <Flex gap="2" align="center" wrap="wrap">
                        <Text weight="bold">{w.title}</Text>
                        {w.origin === 'workspace' ? (
                          <Badge color="violet" variant="soft">
                            Your workspace · {w.visibility === 'public' ? 'Public' : 'Private'}
                          </Badge>
                        ) : (
                          <Badge color="green" variant="soft">
                            EODH catalogue
                          </Badge>
                        )}
                      </Flex>
                      <Text size="2" color="gray" align="left">
                        {w.description}
                      </Text>
                      <Flex gap="1" align="center">
                        {support.supported ? (
                          <CheckCircledIcon color="var(--green-9)" />
                        ) : (
                          <CrossCircledIcon color="var(--gray-9)" />
                        )}
                        <Text size="1" color={support.supported ? 'green' : 'gray'}>
                          {support.reason}
                        </Text>
                      </Flex>
                    </Flex>
                  </button>
                )
              })}
            </Flex>
            <Flex justify="between" gap="3" mt="2">
              <Button variant="soft" color="gray" onClick={() => setStep('scope')}>
                Back
              </Button>
              <Button
                disabled={!workflow || !workflowSupport(workflow).supported}
                onClick={goToInputs}
              >
                Next
              </Button>
            </Flex>
          </Flex>
        )}

        {step === 'inputs' && workflow && (
          <Flex direction="column" gap="4" mt="3">
            <Text size="2" color="gray">
              {workflow.title} · running on {scopeLabel()}
            </Text>
            <LaunchInputs
              inputs={workflow.inputs}
              hubValue={hubValue}
              values={values}
              onChange={(id, value) => setValues((prev) => ({ ...prev, [id]: value }))}
            />
            <Flex justify="between" gap="3" mt="2">
              <Button
                variant="soft"
                color="gray"
                onClick={() =>
                  startAtInputs
                    ? onOpenChange(false)
                    : setStep(initialWorkflowId ? 'scope' : 'workflow')
                }
              >
                Back
              </Button>
              <Button disabled={hasMissingInputs} onClick={() => setStep('review')}>
                Next
              </Button>
            </Flex>
          </Flex>
        )}

        {step === 'review' && workflow && (
          <Flex direction="column" gap="4" mt="3">
            <DataList.Root>
              <DataList.Item>
                <DataList.Label>Workflow</DataList.Label>
                <DataList.Value>{workflow.title}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Runs on</DataList.Label>
                <DataList.Value>{scopeLabel()}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Jobs</DataList.Label>
                <DataList.Value>
                  {jobs === 1 ? '1 job' : `${jobs} jobs, grouped as one run`}
                </DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Workspace</DataList.Label>
                <DataList.Value>
                  {context.workspace} (results go here, and this workspace pays)
                </DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Estimated cost</DataList.Label>
                <DataList.Value>
                  About {credits} credits · balance {DEMO_CREDIT_BALANCE.toLocaleString()} credits
                </DataList.Value>
              </DataList.Item>
            </DataList.Root>

            <Flex direction="column" gap="2">
              {scope === 'results' && context.resultsTotal > MAX_RUN_ITEMS && (
                <Callout.Root color="blue" size="1">
                  <Callout.Icon>
                    <InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Your search found {context.resultsTotal} items. Runs are limited to{' '}
                    {MAX_RUN_ITEMS}, so the latest {MAX_RUN_ITEMS} will be processed.
                  </Callout.Text>
                </Callout.Root>
              )}
              {scope === 'set' && (
                <Callout.Root color="blue" size="1">
                  <Callout.Icon>
                    <InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Uses the {itemCount} items in &apos;{selectedSet?.name}&apos; as they are now.
                    Later changes to the set won&apos;t affect this run.
                  </Callout.Text>
                </Callout.Root>
              )}
              {stagesIn && (
                <Callout.Root color="gray" size="1">
                  <Callout.Icon>
                    <InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    The Hub downloads each item and its files before the workflow starts.
                  </Callout.Text>
                </Callout.Root>
              )}
            </Flex>

            <Flex justify="between" gap="3" mt="2">
              <Button variant="soft" color="gray" onClick={() => setStep('inputs')}>
                Back
              </Button>
              <Button onClick={startRun}>Start run</Button>
            </Flex>
          </Flex>
        )}

        {step === 'started' && workflow && (
          <Flex direction="column" gap="4" mt="3">
            <Callout.Root color="green">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                {workflow.title} started on {scopeLabel()}
                {jobs > 1 ? `, as ${jobs} jobs grouped into one run` : ''}.
              </Callout.Text>
            </Callout.Root>
            <Flex justify="end" gap="3">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
              <Button
                onClick={() => {
                  onOpenChange(false)
                  void navigate('/workflows/runs')
                }}
              >
                View progress
              </Button>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
