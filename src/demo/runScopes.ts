import type { DemoWorkflow, RunScope, SavedSet } from './demoTypes'
import { isDatasetSupported, scopeSupport, type ScopeSupport } from './hubTypes'
import { DEMO_COLLECTIONS, MAX_RUN_ITEMS, SEED_WORKFLOWS } from './mockData'
import type { RunContext } from './useRunContext'

export interface ScopeOption {
  scope: RunScope
  detail: string
  /** Why this choice isn't available right now, in the user's words. */
  disabledReason?: string
}

/** The item ids a run on `scope` would process. */
export const scopeItemIds = (
  scope: RunScope | undefined,
  context: RunContext,
  selectedSet: SavedSet | undefined,
): string[] => {
  switch (scope) {
    case 'item':
      return context.item ? [context.item.id] : []
    case 'pinned':
      return context.pinnedItems.map((i) => i.id)
    case 'set':
      return selectedSet?.items.map((i) => i.id) ?? []
    case 'results':
      return (context.resultIds ?? []).slice(0, MAX_RUN_ITEMS)
    default:
      return []
  }
}

/** The four "run on" choices, with whether each has any data right now. */
export const scopeOptions = (context: RunContext, sets: SavedSet[]): ScopeOption[] => [
  {
    scope: 'item',
    detail: context.item ? context.item.id : 'The item whose details are open',
    disabledReason: context.item ? undefined : "Open an item's details on the map first",
  },
  {
    scope: 'pinned',
    detail: `${context.pinnedItems.length} pinned items`,
    disabledReason: context.pinnedItems.length ? undefined : 'Pin some items on the map first',
  },
  {
    scope: 'set',
    detail: sets.length ? `${sets.length} saved sets in your workspace` : 'No saved sets yet',
    disabledReason: sets.length ? undefined : 'Save your pinned items as a set first',
  },
  {
    scope: 'results',
    detail:
      context.resultsTotal > MAX_RUN_ITEMS
        ? `The latest ${MAX_RUN_ITEMS} of ${context.resultsTotal} results`
        : `${context.resultsTotal} results from your search`,
    disabledReason:
      context.resultIds === undefined
        ? 'Only available from a search in the Data Finder'
        : context.resultsTotal === 0
          ? 'Your search has no results'
          : undefined,
  },
]

export const datasetNames = (workflow: DemoWorkflow) =>
  workflow.datasets === 'any'
    ? 'any dataset'
    : workflow.datasets
        .map((id) => DEMO_COLLECTIONS.find((c) => c.id === id)?.title ?? id)
        .join(', ')

/** Can this workflow run on this dataset and scope? */
export const workflowSupport = (
  workflow: DemoWorkflow,
  scope: RunScope | undefined,
  itemCount: number,
  collectionId: string | undefined,
): ScopeSupport => {
  if (!isDatasetSupported(workflow, collectionId)) {
    return { supported: false, reason: `Only works with ${datasetNames(workflow)}.` }
  }
  return scope ? scopeSupport(workflow, scope, itemCount) : { supported: false, reason: '' }
}

/** Workflows a user in `workspace` can see: their workspace's own, plus the catalogue. */
export const visibleWorkflows = (
  workspaceWorkflows: DemoWorkflow[],
  workspace: string,
  sharedWorkflowId?: string,
) => [
  ...workspaceWorkflows.filter((w) => w.ownerWorkspace === workspace || w.id === sharedWorkflowId),
  ...SEED_WORKFLOWS,
]
