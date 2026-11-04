import { vi } from 'vitest'
import type { Collection, Item, ProcessDetail, WorkflowJob } from '@/types'
import type { SavedSet, SavedSetItem, SavedSetSummary } from '@/services/savedSetsService'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { allWorkflows } from './runWorkflow'

export const sentinelCollection = {
  id: 'sentinel2_ard',
  title: 'Sentinel-2 ARD',
  description: '',
  links: [],
  extent: {},
} as unknown as Collection

/** A collection under a workspace's catalog, such as purchased data or workflow outputs. */
export const workspaceCollection = {
  id: 'purchased_s2',
  title: 'Purchased Sentinel-2',
  description: '',
  links: [
    {
      rel: 'self',
      href: 'https://hub.example/api/catalogue/stac/catalogs/user/catalogs/my-ws/catalogs/commercial-data/collections/purchased_s2',
    },
  ],
  extent: {},
} as unknown as Collection

export const fanOutItemHref = (id: string) =>
  `https://hub.example/api/catalogue/stac/catalogs/public/collections/sentinel2_ard/items/${id}`

/** A public Sentinel-2 item with a self link. */
export const fanOutItem = (id: string, overrides: Partial<Item> = {}): Item =>
  ({
    id,
    collection: 'sentinel2_ard',
    type: 'Feature',
    properties: { datetime: '2025-06-01T11:00:00Z' },
    links: [{ rel: 'self', type: 'application/json', href: fanOutItemHref(id) }],
    assets: {},
    ...overrides,
  }) as unknown as Item

/** `count` public items with ids `${prefix}_1` to `${prefix}_${count}`. */
export const fanOutItems = (count: number, prefix = 'S2A_FAN') =>
  Array.from({ length: count }, (_, i) => fanOutItem(`${prefix}_${i + 1}`))

const defaultRender = { id: 'default', title: 'Default visualization', assets: [] }

/** Pins items on the map, as the Data Finder does. */
export const pinItems = (
  items: Item[],
  {
    isUserCollection = false,
    collection,
  }: { isUserCollection?: boolean; collection?: Collection } = {},
) =>
  dataFinderStore.send({
    type: 'addPinnedItems',
    items,
    collectionRender: defaultRender,
    isLicenseProprietary: false,
    isUserCollection,
    collectionName: collection?.title ?? 'Sentinel-2 ARD',
    collection,
  })

export const clearPins = () => dataFinderStore.send({ type: 'clearAllPinnedItems' })

/** The URL the dialog sends for each job, in the order the jobs were submitted. */
export const sentItemLinks = (calls: unknown[][], key = 'stac_item') =>
  calls.map((call) => (call[1] as Record<string, unknown>)[key])

const SET_ITEM_BASE = 'https://hub.example/api/catalogue/stac/catalogs/public/collections'

export const setItem = (itemId: string, overrides: Partial<SavedSetItem> = {}): SavedSetItem => ({
  id: `entry-${itemId}`,
  collectionId: 'sentinel2_ard',
  itemId,
  selfHref: `${SET_ITEM_BASE}/sentinel2_ard/items/${itemId}`,
  display: { renderId: 'default', visible: true, opacity: 1, isUserCollection: false },
  position: 0,
  addedAt: '2026-10-01T10:00:00Z',
  ...overrides,
})

/** A set item from a workspace's own catalog, so its data is private. */
export const privateSetItem = (itemId: string): SavedSetItem =>
  setItem(itemId, {
    collectionId: 'purchased_s2',
    selfHref: `https://hub.example/api/catalogue/stac/catalogs/user/catalogs/my-ws/catalogs/commercial-data/collections/purchased_s2/items/${itemId}`,
    display: { renderId: 'default', visible: true, opacity: 1, isUserCollection: true },
  })

export const savedSet = (
  items: SavedSetItem[],
  overrides: Partial<SavedSetSummary> = {},
): SavedSet => ({
  id: 'set-1',
  workspace: 'my-ws',
  name: 'Coastal set',
  description: '',
  visibility: 'workspace',
  createdBy: 'alice',
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  itemCount: items.length,
  ...overrides,
  items: items.map((entry, position) => ({ ...entry, position })),
})

export const summaryOf = (set: SavedSet): SavedSetSummary => {
  const summary: Partial<SavedSet> = { ...set }
  delete summary.items
  return summary as SavedSetSummary
}

type Properties = ProcessDetail['properties']

const workflowRecord = (id: string, properties: Partial<Properties>): ProcessDetail => ({
  id,
  type: 'Feature',
  properties: { type: 'workflow', title: id, description: null, ...properties },
  links: [{ rel: 'application', href: `https://github.example/${id}.cwl` }],
})

/** A workflow whose area input is optional, so it can run on the full scene. */
export const optionalAreaWorkflow = workflowRecord('optional-clip', {
  title: 'Optional clip',
  description: 'Clips an item to an area, or keeps the full scene.',
  inputParameters: {
    stac_item: { label: 'STAC item', hubType: 'stac-item', cwlType: 'string' },
    aoi: { label: 'Area of interest', hubType: 'aoi', cwlType: 'string', required: false },
  },
})

/** A workflow with date inputs that the Hub cannot fill outside the Data Finder. */
export const datesWorkflow = workflowRecord('composite', {
  title: 'Composite',
  description: 'Builds a composite for a date and a period.',
  inputParameters: {
    stac_item: { label: 'STAC item', hubType: 'stac-item', cwlType: 'string' },
    start: { label: 'Start date', hubType: 'date', cwlType: 'string' },
    period: { label: 'Period', hubType: 'date-range', cwlType: 'string' },
  },
})

export const fanOutWorkflows = [...allWorkflows, optionalAreaWorkflow, datesWorkflow]

export const workflowJob = (id: string, processID: string): WorkflowJob => ({
  id,
  jobID: id,
  type: 'process',
  processID,
  created: '2026-11-01T10:00:00Z',
  started: '2026-11-01T10:00:05Z',
  finished: null,
  updated: '2026-11-01T10:01:00Z',
  status: 'running',
  message: '',
  links: [],
})

/** Radix Select calls pointer and scroll APIs that jsdom lacks. */
export const stubPointerApis = () => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= vi.fn(() => false)
  proto.setPointerCapture ??= vi.fn()
  proto.releasePointerCapture ??= vi.fn()
  proto.scrollIntoView ??= vi.fn()
}
