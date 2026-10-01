import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import {
  Badge,
  Button,
  Flex,
  Grid,
  Link,
  RadioCards,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes'
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons'
import demoStore from '../demoStore'
import type { DemoWorkflow, RunScope } from '../demoTypes'
import { SCOPE_LABELS, isDatasetSupported, runOnSummary } from '../hubTypes'
import {
  datasetNames,
  scopeItemIds,
  scopeOptions,
  visibleWorkflows,
  workflowSupport,
} from '../runScopes'
import { useRunContext } from '../useRunContext'
import { DemoBadge } from './DemoBadge'
import { RunWorkflowDialog } from './RunWorkflowDialog'
import styles from './demo.module.scss'

const runsOnText = (workflow: DemoWorkflow) => {
  const supported = runOnSummary(workflow)
    .filter((o) => o.supported)
    .map((o) => SCOPE_LABELS[o.scope].toLowerCase())
  if (supported.length === 1 && supported[0] === 'all results') {
    return 'Runs on all results (it runs your search itself)'
  }
  return `Runs on ${supported.join(', ')}`
}

const OriginBadge = ({ workflow }: { workflow: DemoWorkflow }) =>
  workflow.origin === 'workspace' ? (
    <Badge color="violet" variant="soft" size="1">
      Your workspace
    </Badge>
  ) : (
    <Badge color="green" variant="soft" size="1">
      EODH catalogue
    </Badge>
  )

/** "Workflows" tab in the Data Finder: pick a workflow first, then the data to run it on. */
export const WorkflowsTab = () => {
  const context = useRunContext({ inFinder: true })
  const sets = useSelector(demoStore, ({ context: c }) => c.sets)
  const workspaceWorkflows = useSelector(demoStore, ({ context: c }) => c.workspaceWorkflows)
  const panel = useSelector(demoStore, ({ context: c }) => c.panel)
  const [query, setQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const workflows = useMemo(
    () => visibleWorkflows(workspaceWorkflows, context.workspace),
    [workspaceWorkflows, context.workspace],
  )
  const selected = workflows.find((w) => w.id === panel.workflowId)
  const setId = panel.setId ?? sets[0]?.id
  const selectedSet = sets.find((s) => s.id === setId)

  const update = (next: Partial<typeof panel>) =>
    demoStore.send({ type: 'setPanelSelection', panel: { ...panel, ...next } })

  const matches = (w: DemoWorkflow) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [w.title, w.description, ...w.keywords].some((text) => text.toLowerCase().includes(q))
  }

  if (!selected) {
    const groups = [
      { title: 'Your workspace', items: workflows.filter((w) => w.origin === 'workspace') },
      { title: 'EODH catalogue', items: workflows.filter((w) => w.origin === 'catalogue') },
    ]
      .map((g) => ({ ...g, items: g.items.filter(matches) }))
      .filter((g) => g.items.length > 0)

    return (
      <Grid
        style={{
          gridTemplateRows: 'auto auto 1fr auto',
          overflow: 'hidden',
          flexGrow: 1,
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-3)',
        }}
      >
        <Flex justify="between" align="center" gap="2">
          <Text size="2" color="gray">
            Pick a workflow, then choose the data to run it on.
          </Text>
          <DemoBadge />
        </Flex>
        <TextField.Root
          placeholder="Search workflows…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>

        <Flex direction="column" gap="4" style={{ overflowY: 'auto' }}>
          {groups.length === 0 && <Text color="gray">No workflows match your search.</Text>}
          {groups.map((group) => (
            <Flex key={group.title} direction="column" gap="2">
              <Text size="1" weight="bold" color="gray">
                {group.title.toUpperCase()}
              </Text>
              {group.items.map((w) => {
                const unsupported = !isDatasetSupported(w, context.collectionId)
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={styles.workflowOption}
                    disabled={unsupported}
                    onClick={() => update({ workflowId: w.id, scope: undefined })}
                  >
                    <Flex direction="column" gap="1" align="start">
                      <Flex gap="2" align="center" wrap="wrap">
                        <Text weight="bold">{w.title}</Text>
                        <OriginBadge workflow={w} />
                      </Flex>
                      <Text size="1" color="gray" align="left" className={styles.clamp2}>
                        {w.description}
                      </Text>
                      <Text size="1" color={unsupported ? 'gray' : 'blue'} align="left">
                        {unsupported ? `Only works with ${datasetNames(w)}.` : runsOnText(w)}
                      </Text>
                    </Flex>
                  </button>
                )
              })}
            </Flex>
          ))}
        </Flex>

        <Text size="1" color="gray">
          Have your own CWL workflow?{' '}
          <Link asChild>
            <RouterLink to="/workflows/create">Publish it to your workspace</RouterLink>
          </Link>
        </Text>
      </Grid>
    )
  }

  const options = scopeOptions(context, sets).map((option) => {
    const ids = scopeItemIds(option.scope, context, selectedSet)
    const support = workflowSupport(selected, option.scope, ids.length, context.collectionId)
    return {
      ...option,
      reason: option.disabledReason ?? (support.supported ? undefined : support.reason),
      summary: support.supported ? support.reason : undefined,
    }
  })
  const chosen = options.find((o) => o.scope === panel.scope && !o.reason)

  return (
    <Grid
      style={{
        gridTemplateRows: 'auto 1fr auto',
        overflow: 'hidden',
        flexGrow: 1,
        gap: 'var(--space-3)',
        paddingTop: 'var(--space-3)',
      }}
    >
      <Flex justify="between" align="center">
        <Button variant="ghost" size="2" onClick={() => update({ workflowId: undefined })}>
          <ArrowLeftIcon /> All workflows
        </Button>
        <DemoBadge />
      </Flex>

      <Flex direction="column" gap="3" style={{ overflowY: 'auto' }}>
        <Flex direction="column" gap="1">
          <Flex gap="2" align="center" wrap="wrap">
            <Text size="4" weight="bold">
              {selected.title}
            </Text>
            <OriginBadge workflow={selected} />
          </Flex>
          <Text size="2" color="gray">
            {selected.description}
          </Text>
        </Flex>

        <Text size="2" weight="bold">
          Run it on
        </Text>
        <RadioCards.Root
          columns="1"
          size="1"
          value={chosen?.scope ?? ''}
          onValueChange={(value) => update({ scope: value as RunScope })}
        >
          {options.map((option) => (
            <RadioCards.Item key={option.scope} value={option.scope} disabled={!!option.reason}>
              <Flex direction="column" width="100%" gap="1">
                <Flex gap="2" align="center">
                  {option.reason ? (
                    <CrossCircledIcon color="var(--gray-9)" />
                  ) : (
                    <CheckCircledIcon color="var(--green-9)" />
                  )}
                  <Text weight="bold">{SCOPE_LABELS[option.scope]}</Text>
                </Flex>
                <Text size="1" color="gray">
                  {option.reason ?? `${option.detail} · ${option.summary ?? ''}`}
                </Text>
              </Flex>
            </RadioCards.Item>
          ))}
        </RadioCards.Root>

        {chosen?.scope === 'set' && sets.length > 0 && (
          <Select.Root value={setId} onValueChange={(value) => update({ setId: value })}>
            <Select.Trigger />
            <Select.Content>
              {sets.map((s) => (
                <Select.Item key={s.id} value={s.id}>
                  {s.name} ({s.items.length} items)
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}

        <Text size="1" color="gray">
          Pin items or open an item&apos;s details on the map, and these choices update.
        </Text>
      </Flex>

      <Flex justify="end">
        <Button disabled={!chosen} onClick={() => setIsDialogOpen(true)}>
          Next: check inputs
        </Button>
      </Flex>

      <RunWorkflowDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        context={context}
        initialWorkflowId={selected.id}
        initialScope={chosen?.scope}
        initialSetId={setId}
        startAtInputs
      />
    </Grid>
  )
}
