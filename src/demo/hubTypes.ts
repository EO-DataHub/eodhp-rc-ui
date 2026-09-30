import type { DemoWorkflow, HubType, RunScope, WorkflowInput } from './demoTypes'

interface HubTypeInfo {
  label: string
  /** Where the Hub gets the value from, in the user's words. */
  filledFrom: string
  /** What the workflow receives. */
  receives: string
}

export const HUB_TYPES: Record<HubType, HubTypeInfo> = {
  'stac-item': {
    label: 'STAC item',
    filledFrom: 'The item the user selects',
    receives: "The item's URL",
  },
  'stac-items': {
    label: 'STAC items',
    filledFrom: 'Pinned items, a saved set or search results',
    receives: 'A list of item URLs',
  },
  'stac-search': {
    label: 'STAC search',
    filledFrom: "The user's current Data Finder search",
    receives: 'A STAC /search body (JSON)',
  },
  aoi: {
    label: 'Area of interest',
    filledFrom: 'The area drawn on the map',
    receives: 'A GeoJSON geometry',
  },
  bbox: {
    label: 'Bounding box',
    filledFrom: 'The extent of the drawn area',
    receives: '[minx, miny, maxx, maxy]',
  },
  date: {
    label: 'Date',
    filledFrom: 'The search dates',
    receives: 'An RFC 3339 date string',
  },
  'date-range': {
    label: 'Date range',
    filledFrom: 'The search dates',
    receives: 'Two RFC 3339 date strings',
  },
}

/** Which Hub types each CWL input type can be mapped to. */
const COMPATIBILITY: Record<string, HubType[]> = {
  Directory: ['stac-item'],
  'Directory[]': ['stac-items'],
  string: ['stac-item', 'stac-search', 'aoi', 'bbox', 'date'],
  'string[]': ['stac-items', 'date-range'],
  'float[]': ['bbox'],
  'double[]': ['bbox'],
}

export const compatibleHubTypes = (cwlType: string): HubType[] => COMPATIBILITY[cwlType] ?? []

/** The CWL input types that can take a Hub type, e.g. `Directory or string`. */
export const acceptedCwlTypes = (hubType: HubType) =>
  Object.entries(COMPATIBILITY)
    .filter(([, hubTypes]) => hubTypes.includes(hubType))
    .map(([cwlType]) => cwlType)

/** CWL types a user can type a value for in the launch form. */
const USER_ENTERABLE = new Set([
  'string',
  'int',
  'long',
  'float',
  'double',
  'boolean',
  'enum',
  'string[]',
])

export const canBeUserEntered = (cwlType: string) => USER_ENTERABLE.has(cwlType)

export const isSupportedCwlType = (cwlType: string) =>
  canBeUserEntered(cwlType) || compatibleHubTypes(cwlType).length > 0

/** Guess a Hub type from the CWL type and input name. The author must confirm every guess. */
export const suggestHubType = (id: string, cwlType: string): HubType | undefined => {
  const allowed = compatibleHubTypes(cwlType)
  if (allowed.length === 0) return undefined
  if (allowed.length === 1 && cwlType.startsWith('Directory')) return allowed[0]

  const name = id.toLowerCase()
  const pick = (hubType: HubType) => (allowed.includes(hubType) ? hubType : undefined)

  if (/search|query/.test(name)) return pick('stac-search')
  if (/bbox|bounds|extent/.test(name)) return pick('bbox')
  if (/aoi|geometry|geom|area|region|polygon/.test(name)) return pick('aoi')
  if (/date_?range|time_?range|interval/.test(name)) return pick('date-range')
  if (/date|start|end|time/.test(name)) return pick('date')
  if (/items|scenes|images/.test(name)) return pick('stac-items')
  if (/item|stac|scene|image|input|data/.test(name)) return pick('stac-item') ?? pick('stac-items')
  return undefined
}

/** The input that decides what a workflow can run on. */
export const primaryDataInput = (inputs: WorkflowInput[]) =>
  inputs.find(
    (i) =>
      i.source.kind === 'hub' &&
      ['stac-item', 'stac-items', 'stac-search'].includes(i.source.hubType),
  )

export const SCOPE_LABELS: Record<RunScope, string> = {
  item: 'This item',
  pinned: 'Pinned items',
  set: 'A saved set',
  results: 'All results',
}

export interface ScopeSupport {
  supported: boolean
  /** Plain-language explanation shown to the user. */
  reason: string
}

/** Can this workflow run on the chosen scope, and how? */
export const scopeSupport = (
  workflow: Pick<DemoWorkflow, 'inputs' | 'minItems'>,
  scope: RunScope,
  itemCount: number,
): ScopeSupport => {
  const data = primaryDataInput(workflow.inputs)
  const hubType = data?.source.kind === 'hub' ? data.source.hubType : undefined

  if (!hubType || hubType === 'stac-search') {
    return scope === 'results'
      ? { supported: true, reason: 'Runs your search itself' }
      : {
          supported: false,
          reason: 'This workflow runs its own search. Choose All results.',
        }
  }

  if (hubType === 'stac-items') {
    const minItems = workflow.minItems ?? 1
    if (itemCount < minItems) {
      return {
        supported: false,
        reason: `Needs at least ${minItems} items to compare.`,
      }
    }
    return { supported: true, reason: 'One run using all the items together' }
  }

  return itemCount > 1
    ? { supported: true, reason: `Runs once per item (${itemCount} runs)` }
    : { supported: true, reason: 'One run on this item' }
}

/** Summary for the author: which of the "run on" choices a mapping allows. */
export const runOnSummary = (workflow: Pick<DemoWorkflow, 'inputs' | 'minItems'>) =>
  (['item', 'pinned', 'set', 'results'] as RunScope[]).map((scope) => {
    const typicalCount = scope === 'item' ? 1 : 12
    return { scope, ...scopeSupport(workflow, scope, typicalCount) }
  })

export const isDatasetSupported = (workflow: DemoWorkflow, collectionId?: string) => {
  if (workflow.datasets === 'any' || !collectionId) return true
  return workflow.datasets.includes(collectionId)
}

/** Number of jobs a run creates. */
export const jobCount = (workflow: DemoWorkflow, itemCount: number) => {
  const data = primaryDataInput(workflow.inputs)
  return data?.source.kind === 'hub' && data.source.hubType === 'stac-item' ? itemCount : 1
}
