import type { Item } from '@/types'

/** Hub input types a workflow author can map a CWL input to. */
export type HubType =
  | 'stac-item'
  | 'stac-items'
  | 'stac-search'
  | 'aoi'
  | 'bbox'
  | 'date'
  | 'date-range'

/** How a workflow input gets its value at launch. */
export type InputSource = { kind: 'hub'; hubType: HubType } | { kind: 'user' }

export interface WorkflowInput {
  id: string
  /** Normalised CWL type, e.g. `Directory`, `string[]`, `enum`. */
  cwlType: string
  optional: boolean
  label: string
  helpText?: string
  default?: string | number | boolean
  /** Choices for enum inputs. */
  choices?: string[]
  source: InputSource
}

export interface DemoWorkflow {
  id: string
  title: string
  description: string
  keywords: string[]
  /** Collection ids this workflow works with, or `any`. */
  datasets: string[] | 'any'
  inputs: WorkflowInput[]
  /** Minimum number of items for a workflow that takes a list of items. */
  minItems?: number
  creditsPerItem: number
  origin: 'catalogue' | 'workspace'
  visibility: 'private' | 'public'
  ownerWorkspace: string
  cwlFileName?: string
  createdAt: string
}

export interface DemoNotebook {
  id: string
  title: string
  description: string
  /** Collection ids this notebook works with, or `any`. */
  datasets: string[] | 'any'
  /** `stac-items` notebooks take a list of items; `stac-item` ones take a single item. */
  input: 'stac-item' | 'stac-items'
  minItems?: number
  fileName: string
}

/** A saved set item: a reference, plus the full pinned item when saved from the map. */
export interface SetItem {
  id: string
  collection: string
  datetime?: string
  pinned?: Item
}

export interface SavedSet {
  id: string
  name: string
  description?: string
  workspace: string
  createdBy: string
  createdAt: string
  updatedAt: string
  items: SetItem[]
  /** Example sets are seeded demo data with no real items behind them. */
  isExample?: boolean
}

export type RunScope = 'item' | 'pinned' | 'set' | 'results'

export interface RunJob {
  id: string
  label: string
  durationMs: number
  /** Jobs marked to fail show how a partial failure looks. */
  fails: boolean
  retriedAt?: number
}

export interface RunBatch {
  id: string
  workflowId: string
  workflowTitle: string
  scopeLabel: string
  workspace: string
  startedAt: number
  credits: number
  jobs: RunJob[]
}
