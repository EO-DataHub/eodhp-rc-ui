import { vi } from 'vitest'
import type { Item, ProcessDetail, ProcessRecord } from '@/types'

export const ITEM_SELF_HREF = 'https://hub.example/api/catalogue/stac/items/S2A_20250601'

export const item = {
  id: 'S2A_20250601',
  collection: 'sentinel2_ard',
  type: 'Feature',
  properties: { datetime: '2025-06-01T11:00:00Z' },
  links: [{ rel: 'self', type: 'application/json', href: ITEM_SELF_HREF }],
  assets: {},
} as unknown as Item

export const aoi: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-1, 51],
        [0, 51],
        [0, 52],
        [-1, 52],
        [-1, 51],
      ],
    ],
  },
}

type Properties = ProcessDetail['properties']

const workflowRecord = (id: string, properties: Partial<Properties>): ProcessDetail => ({
  id,
  type: 'Feature',
  properties: {
    type: 'workflow',
    title: id,
    description: null,
    ...properties,
  },
  links: [{ rel: 'application', href: `https://github.example/${id}.cwl` }],
})

/** A workflow whose inputs carry Hub types, plus one input the user fills in. */
export const ndviWorkflow = workflowRecord('ndvi', {
  title: 'NDVI',
  description: 'Calculates NDVI for one Sentinel-2 item.',
  applicableCollections: ['sentinel2_ard'],
  inputParameters: {
    stac_item: {
      label: 'STAC item',
      hubType: 'stac-item',
      cwlType: 'Directory',
      staging: 'assets',
    },
    aoi: {
      label: 'Area of interest',
      hubType: 'aoi',
      cwlType: 'string',
    },
    threshold: {
      label: 'Threshold',
      type: 'number',
      cwlType: 'string',
      default: 0.3,
    },
  },
})

/** A workflow record written before Hub types existed. */
export const legacyWorkflow = workflowRecord('clip', {
  title: 'Clip',
  description: 'Clips an item to an area.',
  applicableCollections: ['sentinel2_ard'],
  inputParameters: {
    stac_item: { label: 'Item link', variableRef: 'STAC_ITEM_LINK' },
    bbox: { label: 'Bounding box', variableRef: 'AOI' },
  },
})

export const landsatWorkflow = workflowRecord('landsat-only', {
  title: 'Landsat surface temperature',
  description: 'Works on Landsat items only.',
  applicableCollections: ['landsat_c2l2'],
  inputParameters: {
    stac_item: { label: 'STAC item', hubType: 'stac-item', cwlType: 'Directory' },
  },
})

export const anyDatasetWorkflow = workflowRecord('footprint', {
  title: 'Footprint',
  description: 'Works on items from any dataset.',
  inputParameters: {
    stac_item: { label: 'STAC item', hubType: 'stac-item', cwlType: 'string' },
  },
})

/** A workflow whose inputs are all filled by the Hub, one of them an area. */
export const areaWorkflow = workflowRecord('area-mask', {
  title: 'Area mask',
  description: 'Masks an item to the drawn area.',
  applicableCollections: ['sentinel2_ard'],
  inputParameters: {
    stac_item: { label: 'STAC item', hubType: 'stac-item', cwlType: 'string' },
    aoi: { label: 'Area of interest', hubType: 'aoi', cwlType: 'string' },
  },
})

export const allWorkflows = [
  ndviWorkflow,
  legacyWorkflow,
  landsatWorkflow,
  anyDatasetWorkflow,
  areaWorkflow,
]

/** List responses from the catalogue leave out links, as the real API does. */
export const listRecord = ({ id, type, properties }: ProcessDetail): ProcessRecord => ({
  id,
  type,
  properties,
})

export const notebookRecord = (
  id: string,
  inputParameters: Properties['inputParameters'],
): ProcessDetail => ({
  id,
  type: 'Feature',
  properties: {
    type: 'notebook',
    title: id,
    description: null,
    applicableCollections: ['sentinel2_ard'],
    inputParameters,
  },
  links: [{ rel: 'application', href: `https://notebooks.example/${id}.ipynb` }],
})

/**
 * Stubs browser APIs the components use but the test runtime lacks: localStorage, where the map
 * store saves the drawn area, and ResizeObserver, which Radix controls call.
 */
export const stubBrowserGlobals = () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  })
}
