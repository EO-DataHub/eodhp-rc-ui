import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useSelector } from '@xstate/store/react'
import {
  Badge,
  Button,
  Callout,
  Card,
  CheckboxCards,
  DataList,
  Flex,
  RadioCards,
  Select,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes'
import {
  CheckCircledIcon,
  CheckIcon,
  CopyIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  UploadIcon,
} from '@radix-ui/react-icons'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import demoStore from '../demoStore'
import type { DemoWorkflow, HubType, WorkflowInput } from '../demoTypes'
import { parseCwl, type ParsedCwl, type ParsedCwlInput } from '../cwlParser'
import {
  HUB_TYPES,
  SCOPE_LABELS,
  acceptedCwlTypes,
  canBeUserEntered,
  compatibleHubTypes,
  runOnSummary,
  suggestHubType,
} from '../hubTypes'
import { DEMO_COLLECTIONS, DEMO_WORKSPACE } from '../mockData'
import { SAMPLE_CWL, SAMPLE_CWL_FILE_NAME } from '../sampleCwl'
import { DemoBadge } from '../components/DemoBadge'
import { LaunchInputs } from '../components/LaunchInputs'
import { initialUserValues, type HubValue } from '../launchValues'
import styles from '../components/demo.module.scss'

const STEPS = ['Upload', 'Details', 'Inputs', 'Preview', 'Publish'] as const
type StepIndex = 0 | 1 | 2 | 3 | 4

const USER_SOURCE = 'user'

interface InputMapping {
  /** A Hub type, or `user` for "Entered by the user". */
  source: HubType | typeof USER_SOURCE
  suggested: boolean
  confirmed: boolean
  label: string
  helpText: string
  default: string
}

const humanise = (id: string) => {
  const words = id.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const initialMapping = (input: ParsedCwlInput): InputMapping => {
  const suggestion = suggestHubType(input.id, input.cwlType)
  return {
    source: suggestion ?? USER_SOURCE,
    suggested: !!suggestion,
    confirmed: !suggestion,
    label: input.label ?? humanise(input.id),
    helpText: input.doc ?? '',
    default: input.default === undefined ? '' : String(input.default),
  }
}

const toWorkflowInput = (input: ParsedCwlInput, mapping: InputMapping): WorkflowInput => {
  const isNumber = ['int', 'long', 'float', 'double'].includes(input.cwlType)
  const defaultValue =
    mapping.default === ''
      ? undefined
      : isNumber
        ? Number(mapping.default)
        : input.cwlType === 'boolean'
          ? mapping.default === 'true'
          : mapping.default
  return {
    id: input.id,
    cwlType: input.cwlType,
    optional: input.optional,
    label: mapping.label || humanise(input.id),
    helpText: mapping.helpText || undefined,
    default: defaultValue,
    choices: input.choices,
    source:
      mapping.source === USER_SOURCE ? { kind: 'user' } : { kind: 'hub', hubType: mapping.source },
  }
}

/** Example values the Preview step shows for Hub-filled inputs. */
const previewHubValue = (input: WorkflowInput): HubValue => {
  if (input.source.kind !== 'hub') return { text: '' }
  switch (input.source.hubType) {
    case 'stac-item':
      return { text: 'The item the user selected, or one run per item for several items' }
    case 'stac-items':
      return { text: 'The pinned items, saved set or search results the user chose' }
    case 'stac-search':
      return { text: "The user's current Data Finder search" }
    case 'aoi':
      return { text: 'The area the user drew on the map' }
    case 'bbox':
      return { text: 'The extent of the area the user drew' }
    default:
      return { text: "The dates in the user's search filters" }
  }
}

const Stepper = ({
  current,
  maxReached,
  onSelect,
}: {
  current: StepIndex
  maxReached: StepIndex
  onSelect: (step: StepIndex) => void
}) => (
  <ol className={styles.stepper} aria-label="Create workflow steps">
    {STEPS.map((label, index) => {
      const state =
        index === current
          ? styles.stepperItemActive
          : index <= maxReached
            ? styles.stepperItemDone
            : ''
      return (
        <li key={label}>
          <button
            type="button"
            className={`${styles.stepperItem} ${state}`}
            style={{ border: 0, cursor: index <= maxReached ? 'pointer' : 'default' }}
            disabled={index > maxReached}
            aria-current={index === current ? 'step' : undefined}
            onClick={() => onSelect(index as StepIndex)}
          >
            {index < current ? <CheckIcon /> : <span>{index + 1}</span>}
            {label}
          </button>
        </li>
      )
    })}
  </ol>
)

const CheckList = ({ parsed }: { parsed: ParsedCwl }) => (
  <Flex direction="column" gap="2">
    {parsed.checks.map((check, index) => (
      <Flex key={index} gap="2" align="start">
        {check.level === 'ok' && <CheckCircledIcon color="var(--green-9)" />}
        {check.level === 'warning' && <ExclamationTriangleIcon color="var(--amber-9)" />}
        {check.level === 'error' && <CrossCircledIcon color="var(--red-9)" />}
        <Text size="2">{check.message}</Text>
      </Flex>
    ))}
  </Flex>
)

const hubOptionLabel = (hubType: HubType) =>
  `Filled by the Hub: ${HUB_TYPES[hubType].label} (${HUB_TYPES[hubType].filledFrom.toLowerCase()})`

const InputCard = ({
  input,
  mapping,
  onChange,
}: {
  input: ParsedCwlInput
  mapping: InputMapping
  onChange: (next: Partial<InputMapping>) => void
}) => {
  const hubTypes = compatibleHubTypes(input.cwlType)
  const userAllowed = canBeUserEntered(input.cwlType)
  const needsCheck = mapping.suggested && !mapping.confirmed

  return (
    <div className={`${styles.inputCard} ${needsCheck ? styles.inputCardUnconfirmed : ''}`}>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex direction="column" gap="1">
            <Flex gap="2" align="center" wrap="wrap">
              <span className={styles.code}>{input.id}</span>
              <Badge variant="outline" color="gray">
                {input.cwlType}
              </Badge>
              {input.optional && (
                <Text size="1" color="gray">
                  optional
                </Text>
              )}
            </Flex>
            {input.doc && (
              <Text size="2" color="gray">
                {input.doc}
              </Text>
            )}
          </Flex>
          {needsCheck && (
            <Flex gap="2" align="center">
              <Badge color="amber" variant="solid">
                Suggested — check
              </Badge>
              <Button size="1" variant="soft" onClick={() => onChange({ confirmed: true })}>
                <CheckIcon /> Confirm
              </Button>
            </Flex>
          )}
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            How is this input filled?
          </Text>
          <Select.Root
            value={mapping.source}
            onValueChange={(value) =>
              onChange({ source: value as InputMapping['source'], confirmed: true })
            }
          >
            <Select.Trigger />
            <Select.Content>
              {(Object.keys(HUB_TYPES) as HubType[]).map((hubType) => {
                const fits = hubTypes.includes(hubType)
                return (
                  <Select.Item key={hubType} value={hubType} disabled={!fits}>
                    {hubOptionLabel(hubType)}
                    {!fits && ` — needs a ${acceptedCwlTypes(hubType).join(' or ')} input`}
                  </Select.Item>
                )
              })}
              <Select.Separator />
              <Select.Item value={USER_SOURCE} disabled={!userAllowed}>
                Entered by the user
                {!userAllowed && ` — users can't type a ${input.cwlType} value`}
              </Select.Item>
            </Select.Content>
          </Select.Root>
          {mapping.source !== USER_SOURCE && (
            <Text size="1" color="gray">
              Your workflow receives: {HUB_TYPES[mapping.source].receives}.
              {mapping.source === 'stac-item' &&
                input.cwlType === 'Directory' &&
                ' The Hub downloads the item and all its files before your workflow starts. If you only need a few bands, use a string input and fetch just those.'}
              {mapping.source === 'stac-item' &&
                input.cwlType === 'string' &&
                ' Your workflow fetches the item and the files it needs itself.'}
            </Text>
          )}
        </Flex>

        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: '1 1 220px' }}>
            <Text size="2" weight="medium">
              Label users see
            </Text>
            <TextField.Root
              value={mapping.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </Flex>
          {mapping.source === USER_SOURCE && (
            <Flex direction="column" gap="1" style={{ flex: '1 1 160px' }}>
              <Text size="2" weight="medium">
                Default
              </Text>
              {input.choices ? (
                <Select.Root
                  value={mapping.default || undefined}
                  onValueChange={(value) => onChange({ default: value })}
                >
                  <Select.Trigger placeholder="No default" />
                  <Select.Content>
                    {input.choices.map((choice) => (
                      <Select.Item key={choice} value={choice}>
                        {choice}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              ) : (
                <TextField.Root
                  value={mapping.default}
                  placeholder="No default"
                  onChange={(e) => onChange({ default: e.target.value })}
                />
              )}
            </Flex>
          )}
        </Flex>
        {mapping.source === USER_SOURCE && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Help text
            </Text>
            <TextField.Root
              value={mapping.helpText}
              placeholder="Shown under the field in the launch form"
              onChange={(e) => onChange({ helpText: e.target.value })}
            />
            {input.choices && (
              <Text size="1" color="gray">
                Users choose from: {input.choices.join(', ')} (from your CWL)
              </Text>
            )}
          </Flex>
        )}
      </Flex>
    </div>
  )
}

export const CreateWorkflowPage = () => {
  const navigate = useNavigate()
  const { currentWorkspace } = useContext(AuthenticationContext)
  const workspace = currentWorkspace ?? DEMO_WORKSPACE
  const workspaceWorkflows = useSelector(demoStore, ({ context }) => context.workspaceWorkflows)

  const [step, setStep] = useState<StepIndex>(0)
  const [maxReached, setMaxReached] = useState<StepIndex>(0)
  const [fileName, setFileName] = useState<string>()
  const [parsed, setParsed] = useState<ParsedCwl>()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState('')
  const [datasets, setDatasets] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, InputMapping>>({})
  const [publishedId, setPublishedId] = useState<string>()

  const published = workspaceWorkflows.find((w) => w.id === publishedId)

  const goTo = (next: StepIndex) => {
    setStep(next)
    setMaxReached((prev) => (next > prev ? next : prev))
  }

  const loadCwl = (name: string, text: string) => {
    const result = parseCwl(text)
    setFileName(name)
    setParsed(result)
    setTitle(result.label ?? (result.id && result.id !== 'main' ? humanise(result.id) : ''))
    setDescription(result.doc ?? '')
    setMappings(Object.fromEntries(result.inputs.map((i) => [i.id, initialMapping(i)])))
    setMaxReached(0)
    setPublishedId(undefined)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: {
      'application/x-yaml': ['.cwl', '.yaml', '.yml'],
      'application/json': ['.json'],
    },
    onDrop: (files) => {
      const file = files[0]
      if (!file) return
      void file.text().then((text) => loadCwl(file.name, text))
    },
  })

  const inputs = useMemo(() => parsed?.inputs ?? [], [parsed])
  const hasErrors = parsed?.checks.some((c) => c.level === 'error') ?? true
  const hasUnpinnedImages =
    parsed?.checks.some((c) => c.level === 'warning' && c.message.includes('pinned by digest')) ??
    false
  const unconfirmed = inputs.filter((i) => mappings[i.id]?.suggested && !mappings[i.id]?.confirmed)

  const workflowInputs = useMemo(
    () => inputs.map((i) => toWorkflowInput(i, mappings[i.id] ?? initialMapping(i))),
    [inputs, mappings],
  )
  const runOn = runOnSummary({ inputs: workflowInputs })
  const hubCount = workflowInputs.filter((i) => i.source.kind === 'hub').length

  const publish = () => {
    const slug = (title || 'workflow').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const id = `${slug}-${Date.now().toString(36)}`
    const workflow: DemoWorkflow = {
      id,
      title: title.trim(),
      description: description.trim(),
      keywords: keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      datasets: datasets.length ? datasets : 'any',
      inputs: workflowInputs,
      creditsPerItem: 3,
      origin: 'workspace',
      visibility: 'private',
      ownerWorkspace: workspace,
      cwlFileName: fileName,
      createdAt: new Date().toISOString(),
    }
    demoStore.send({ type: 'publishWorkflow', workflow })
    setPublishedId(id)
  }

  const shareLink = published
    ? `${window.location.origin}${window.location.pathname}#/finder/${
        published.datasets === 'any' ? 'sentinel2_ard' : published.datasets[0]
      }?runWorkflow=${published.id}`
    : ''

  const copyShareLink = () => {
    navigator.clipboard
      .writeText(shareLink)
      .then(() => toast.success('Share link copied', { autoClose: 2500 }))
      .catch(() => toast.error('Could not copy the link', { autoClose: 2500 }))
  }

  const reset = () => {
    setParsed(undefined)
    setFileName(undefined)
    setTitle('')
    setDescription('')
    setKeywords('')
    setDatasets([])
    setMappings({})
    setPublishedId(undefined)
    setStep(0)
    setMaxReached(0)
  }

  return (
    <Flex direction="column" gap="5" className={styles.page}>
      <Flex justify="between" align="start" gap="4">
        <PageHeading
          title="Create workflow"
          subtitle="Upload a CWL file, tell the Hub how to fill its inputs, and publish it to your workspace."
          badge="none"
        />
        <DemoBadge />
      </Flex>

      <Stepper current={step} maxReached={maxReached} onSelect={goTo} />

      {step === 0 && (
        <Flex direction="column" gap="4">
          <div
            {...getRootProps({
              className: `${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`,
            })}
          >
            <input {...getInputProps()} />
            <Flex direction="column" align="center" gap="2">
              <UploadIcon width="28" height="28" />
              <Text weight="medium">Drag a CWL file here, or click to choose one</Text>
              <Text size="2" color="gray">
                .cwl, .yaml or .json. Packed workflows ($graph) are supported.
              </Text>
            </Flex>
          </div>
          <Flex justify="center">
            <Button variant="ghost" onClick={() => loadCwl(SAMPLE_CWL_FILE_NAME, SAMPLE_CWL)}>
              Or use a sample CWL file
            </Button>
          </Flex>

          {parsed && (
            <Card>
              <Flex direction="column" gap="3">
                <Text weight="bold">{fileName}</Text>
                <CheckList parsed={parsed} />
              </Flex>
            </Card>
          )}

          <Flex justify="end">
            <Button disabled={!parsed || hasErrors} onClick={() => goTo(1)}>
              Next: details
            </Button>
          </Flex>
        </Flex>
      )}

      {step === 1 && (
        <Flex direction="column" gap="4" maxWidth="720px">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="wf-title">
              Title
            </Text>
            <TextField.Root
              id="wf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Flex>
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="wf-description">
              Description
            </Text>
            <TextArea
              id="wf-description"
              value={description}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Flex>
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="wf-keywords">
              Keywords{' '}
              <Text size="1" color="gray" weight="regular">
                comma separated
              </Text>
            </Text>
            <TextField.Root
              id="wf-keywords"
              value={keywords}
              placeholder="e.g. fire, burn severity"
              onChange={(e) => setKeywords(e.target.value)}
            />
          </Flex>
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Which datasets does it work with?
            </Text>
            <Text size="1" color="gray">
              Users only see this workflow for items from these datasets. Leave them all unticked if
              it works with any dataset.
            </Text>
            <CheckboxCards.Root
              columns={{ initial: '1', sm: '2' }}
              value={datasets}
              onValueChange={setDatasets}
            >
              {DEMO_COLLECTIONS.map((collection) => (
                <CheckboxCards.Item key={collection.id} value={collection.id}>
                  <Flex direction="column">
                    <Text weight="medium">{collection.title}</Text>
                    <Text size="1" color="gray">
                      {collection.id}
                    </Text>
                  </Flex>
                </CheckboxCards.Item>
              ))}
            </CheckboxCards.Root>
          </Flex>
          <Flex justify="between">
            <Button variant="soft" color="gray" onClick={() => goTo(0)}>
              Back
            </Button>
            <Button disabled={!title.trim()} onClick={() => goTo(2)}>
              Next: inputs
            </Button>
          </Flex>
        </Flex>
      )}

      {step === 2 && (
        <Flex direction="column" gap="4">
          <Text size="2" color="gray">
            For each input in your CWL, choose whether the Hub fills it in or the user types a
            value. The Hub has guessed some of these. Check each guess before you publish.
          </Text>
          {unconfirmed.length > 0 && (
            <Callout.Root color="amber" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                {unconfirmed.length === 1
                  ? '1 suggestion to check'
                  : `${unconfirmed.length} suggestions to check`}
              </Callout.Text>
            </Callout.Root>
          )}
          {inputs.map((input) => (
            <InputCard
              key={input.id}
              input={input}
              mapping={mappings[input.id]}
              onChange={(next) =>
                setMappings((prev) => ({ ...prev, [input.id]: { ...prev[input.id], ...next } }))
              }
            />
          ))}
          <Flex justify="between">
            <Button variant="soft" color="gray" onClick={() => goTo(1)}>
              Back
            </Button>
            <Button disabled={unconfirmed.length > 0} onClick={() => goTo(3)}>
              Next: preview
            </Button>
          </Flex>
        </Flex>
      )}

      {step === 3 && (
        <Flex direction="column" gap="4">
          <Flex gap="4" wrap="wrap" align="start">
            <Card style={{ flex: '2 1 380px' }}>
              <Flex direction="column" gap="4">
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" weight="bold">
                    WHAT USERS SEE WHEN THEY RUN IT
                  </Text>
                  <Text size="5" weight="bold">
                    {title}
                  </Text>
                </Flex>
                <LaunchInputs
                  inputs={workflowInputs}
                  hubValue={previewHubValue}
                  values={initialUserValues(workflowInputs)}
                  readOnly
                />
              </Flex>
            </Card>
            <Flex direction="column" gap="4" style={{ flex: '1 1 260px' }}>
              <Card>
                <Flex direction="column" gap="3">
                  <Text size="1" color="gray" weight="bold">
                    USERS CAN RUN IT ON
                  </Text>
                  {runOn.map((option) => (
                    <Flex key={option.scope} gap="2" align="start">
                      {option.supported ? (
                        <CheckCircledIcon color="var(--green-9)" style={{ marginTop: 3 }} />
                      ) : (
                        <CrossCircledIcon color="var(--gray-9)" style={{ marginTop: 3 }} />
                      )}
                      <Flex direction="column">
                        <Text size="2" weight="medium">
                          {SCOPE_LABELS[option.scope]}
                        </Text>
                        <Text size="1" color="gray">
                          {option.reason}
                        </Text>
                      </Flex>
                    </Flex>
                  ))}
                  <Text size="1" color="gray">
                    Worked out from how you mapped the inputs. To change it, change the mapping.
                  </Text>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" gap="2">
                  <Text size="1" color="gray" weight="bold">
                    IN THE WORKFLOW LIST
                  </Text>
                  <Flex gap="2" align="center" wrap="wrap">
                    <Text weight="bold">{title}</Text>
                    <Badge color="violet" variant="soft">
                      Your workspace · Private
                    </Badge>
                  </Flex>
                  <Text size="2" color="gray">
                    {description || 'No description'}
                  </Text>
                  <Flex gap="1" wrap="wrap">
                    {(datasets.length ? datasets : ['Any dataset']).map((d) => (
                      <Badge key={d} variant="outline" color="gray">
                        {d}
                      </Badge>
                    ))}
                  </Flex>
                </Flex>
              </Card>
            </Flex>
          </Flex>
          <Flex justify="between">
            <Button variant="soft" color="gray" onClick={() => goTo(2)}>
              Back
            </Button>
            <Button onClick={() => goTo(4)}>Next: publish</Button>
          </Flex>
        </Flex>
      )}

      {step === 4 && !published && (
        <Flex direction="column" gap="4" maxWidth="720px">
          <DataList.Root>
            <DataList.Item>
              <DataList.Label>Title</DataList.Label>
              <DataList.Value>{title}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>CWL file</DataList.Label>
              <DataList.Value>{fileName}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Datasets</DataList.Label>
              <DataList.Value>
                {datasets.length ? datasets.join(', ') : 'Any dataset'}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Inputs</DataList.Label>
              <DataList.Value>
                {hubCount} filled by the Hub, {workflowInputs.length - hubCount} entered by users
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Can run on</DataList.Label>
              <DataList.Value>
                {runOn
                  .filter((o) => o.supported)
                  .map((o) => SCOPE_LABELS[o.scope])
                  .join(', ') || 'Nothing: check the input mapping'}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Who can run it</DataList.Label>
              <DataList.Value>Members of {workspace}</DataList.Value>
            </DataList.Item>
          </DataList.Root>
          <Flex justify="between">
            <Button variant="soft" color="gray" onClick={() => goTo(3)}>
              Back
            </Button>
            <Button onClick={publish}>Publish privately</Button>
          </Flex>
        </Flex>
      )}

      {step === 4 && published && (
        <Flex direction="column" gap="4" maxWidth="720px">
          <Callout.Root color="green">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <strong>{published.title}</strong> is published to {workspace}. Members can run it
              from the Data Finder now.
            </Callout.Text>
          </Callout.Root>

          <Card>
            <Flex direction="column" gap="3">
              <Text weight="bold">Who can run it</Text>
              <RadioCards.Root
                columns="2"
                value={published.visibility}
                onValueChange={(value) =>
                  demoStore.send({
                    type: 'setWorkflowVisibility',
                    workflowId: published.id,
                    visibility: value as DemoWorkflow['visibility'],
                  })
                }
              >
                <RadioCards.Item value="private">
                  <Flex direction="column" width="100%">
                    <Text weight="bold">Private</Text>
                    <Text size="1" color="gray">
                      Members of {workspace}
                    </Text>
                  </Flex>
                </RadioCards.Item>
                <RadioCards.Item value="public" disabled={hasUnpinnedImages}>
                  <Flex direction="column" width="100%">
                    <Text weight="bold">Public</Text>
                    <Text size="1" color="gray">
                      Anyone with the link
                    </Text>
                  </Flex>
                </RadioCards.Item>
              </RadioCards.Root>
              <Text size="2" color="gray">
                {published.visibility === 'private'
                  ? `Only members of ${workspace} can find and run it.`
                  : 'Any signed-in Hub user with the link can run it. It is not listed in the EODH catalogue or in search.'}{' '}
                Only workspace owners and admins can change this.
              </Text>
              {hasUnpinnedImages && (
                <Text size="2" color="orange">
                  To make it public, pin its container images by digest (image@sha256:…) and upload
                  it again.
                </Text>
              )}
              {published.visibility === 'public' && (
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">
                    Share link
                  </Text>
                  <Flex gap="2">
                    <TextField.Root value={shareLink} readOnly style={{ flexGrow: 1 }} />
                    <Button variant="soft" onClick={copyShareLink}>
                      <CopyIcon /> Copy
                    </Button>
                  </Flex>
                  <Text size="1" color="gray">
                    Opens the Data Finder with this workflow ready to run on the data they choose.
                  </Text>
                </Flex>
              )}
            </Flex>
          </Card>

          <Callout.Root color="gray" size="1">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              To list it in the EODH catalogue, a workspace owner can request a review by Hub admins
              once it is public. That review step isn&apos;t part of this demo.
            </Callout.Text>
          </Callout.Root>

          <Flex justify="between" gap="3" wrap="wrap">
            <Button variant="soft" color="gray" onClick={reset}>
              Create another
            </Button>
            <Button
              onClick={() =>
                navigate(
                  published.visibility === 'public'
                    ? shareLink.slice(shareLink.indexOf('#') + 1)
                    : `/finder/${published.datasets === 'any' ? 'sentinel2_ard' : published.datasets[0]}`,
                )
              }
            >
              Try it in the Data Finder
            </Button>
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}
