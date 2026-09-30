import type { DemoWorkflow, RunBatch, SavedSet } from './demoTypes'

export const DEMO_WORKSPACE = 'demo-workspace'
export const DEMO_USER = 'demo-user'
export const DEMO_CREDIT_BALANCE = 1240
/** The most items "All results" will process in one run. */
export const MAX_RUN_ITEMS = 25

/** Collections an author can pick on the Details step. */
export const DEMO_COLLECTIONS = [
  { id: 'sentinel2_ard', title: 'Sentinel-2 ARD (DEFRA/JNCC)' },
  { id: 'sentinel-2-l2a', title: 'Sentinel-2 L2A' },
  { id: 'sentinel-2-c1-l2a', title: 'Sentinel-2 Collection 1 L2A' },
  { id: 'sentinel1', title: 'Sentinel-1 GRD' },
  { id: 'landsat-c2-l2', title: 'Landsat Collection 2 L2' },
  { id: 'esacci-globallc', title: 'ESA CCI Global Land Cover' },
]

const created = '2026-06-01T09:00:00Z'

export const SEED_WORKFLOWS: DemoWorkflow[] = [
  {
    id: 'ndvi-calculation',
    title: 'NDVI Calculation',
    description:
      'Calculates the Normalised Difference Vegetation Index for each item and writes a Cloud Optimised GeoTIFF.',
    keywords: ['vegetation', 'index'],
    datasets: 'any',
    creditsPerItem: 3,
    origin: 'catalogue',
    visibility: 'public',
    ownerWorkspace: 'discoveryreg',
    createdAt: created,
    inputs: [
      {
        id: 'stac_item',
        cwlType: 'Directory',
        optional: false,
        label: 'Input image',
        source: { kind: 'hub', hubType: 'stac-item' },
      },
      {
        id: 'aoi',
        cwlType: 'string',
        optional: true,
        label: 'Clip to area',
        source: { kind: 'hub', hubType: 'aoi' },
      },
      {
        id: 'output_format',
        cwlType: 'enum',
        optional: false,
        label: 'Output format',
        helpText: 'COG works best for viewing on the map.',
        default: 'COG',
        choices: ['COG', 'NetCDF'],
        source: { kind: 'user' },
      },
    ],
  },
  {
    id: 'cloud-mask',
    title: 'Cloud and shadow mask',
    description: 'Builds a cloud and cloud-shadow mask for each optical item.',
    keywords: ['cloud', 'mask'],
    datasets: 'any',
    creditsPerItem: 2,
    origin: 'catalogue',
    visibility: 'public',
    ownerWorkspace: 'discoveryreg',
    createdAt: created,
    inputs: [
      {
        id: 'item_url',
        cwlType: 'string',
        optional: false,
        label: 'Input image',
        source: { kind: 'hub', hubType: 'stac-item' },
      },
      {
        id: 'threshold',
        cwlType: 'float',
        optional: false,
        label: 'Cloud probability threshold',
        helpText: 'Pixels above this probability are masked (0 to 1).',
        default: 0.4,
        source: { kind: 'user' },
      },
    ],
  },
  {
    id: 'change-detection',
    title: 'Land cover change detection',
    description:
      'Compares two or more dates of imagery over your area and maps where the land cover changed.',
    keywords: ['change', 'land cover'],
    datasets: 'any',
    minItems: 2,
    creditsPerItem: 4,
    origin: 'catalogue',
    visibility: 'public',
    ownerWorkspace: 'discoveryreg',
    createdAt: created,
    inputs: [
      {
        id: 'items',
        cwlType: 'Directory[]',
        optional: false,
        label: 'Images to compare',
        source: { kind: 'hub', hubType: 'stac-items' },
      },
      {
        id: 'aoi',
        cwlType: 'string',
        optional: true,
        label: 'Area to analyse',
        source: { kind: 'hub', hubType: 'aoi' },
      },
      {
        id: 'method',
        cwlType: 'enum',
        optional: false,
        label: 'Comparison method',
        default: 'difference',
        choices: ['difference', 'ratio', 'classification'],
        source: { kind: 'user' },
      },
    ],
  },
  {
    id: 'water-extent',
    title: 'Water extent over time',
    description:
      'Runs your search, maps open water in every matching image and builds a time series.',
    keywords: ['water', 'time series'],
    datasets: 'any',
    creditsPerItem: 2,
    origin: 'catalogue',
    visibility: 'public',
    ownerWorkspace: 'discoveryreg',
    createdAt: created,
    inputs: [
      {
        id: 'search',
        cwlType: 'string',
        optional: false,
        label: 'Images to process',
        source: { kind: 'hub', hubType: 'stac-search' },
      },
      {
        id: 'smoothing',
        cwlType: 'boolean',
        optional: false,
        label: 'Smooth the time series',
        default: true,
        source: { kind: 'user' },
      },
    ],
  },
  {
    id: 's1-flood-mapping',
    title: 'Sentinel-1 flood mapping',
    description: 'Detects flooded areas from Sentinel-1 radar backscatter.',
    keywords: ['flood', 'radar'],
    datasets: ['sentinel1'],
    creditsPerItem: 5,
    origin: 'catalogue',
    visibility: 'public',
    ownerWorkspace: 'discoveryreg',
    createdAt: created,
    inputs: [
      {
        id: 'scene',
        cwlType: 'Directory',
        optional: false,
        label: 'Radar scene',
        source: { kind: 'hub', hubType: 'stac-item' },
      },
      {
        id: 'polarisation',
        cwlType: 'enum',
        optional: false,
        label: 'Polarisation',
        default: 'VV',
        choices: ['VV', 'VH'],
        source: { kind: 'user' },
      },
    ],
  },
]

const exampleItems = (prefix: string, count: number, collection: string, start: Date) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getTime() + index * 5 * 24 * 3600 * 1000)
    const stamp = date.toISOString().slice(0, 10).replace(/-/g, '')
    return {
      id: `${prefix}_${stamp}_T30UXC`,
      collection,
      datetime: date.toISOString(),
    }
  })

export const SEED_SETS: SavedSet[] = [
  {
    id: 'set-thames-estuary',
    name: 'Thames estuary, summer 2025',
    description: 'Cloud-free scenes for the saltmarsh monitoring report.',
    workspace: DEMO_WORKSPACE,
    createdBy: 'a.patel',
    createdAt: '2026-08-12T10:15:00Z',
    updatedAt: '2026-09-18T14:02:00Z',
    items: exampleItems('S2A_MSIL2A', 8, 'sentinel2_ard', new Date('2025-06-02T11:00:00Z')),
    isExample: true,
  },
  {
    id: 'set-field-trials',
    name: 'Field trial plots',
    workspace: DEMO_WORKSPACE,
    createdBy: DEMO_USER,
    createdAt: '2026-09-02T08:40:00Z',
    updatedAt: '2026-09-02T08:40:00Z',
    items: exampleItems('S2B_MSIL2A', 3, 'sentinel2_ard', new Date('2025-05-10T11:00:00Z')),
    isExample: true,
  },
]

export const seedRuns = (now: number): RunBatch[] => [
  {
    id: 'run-example',
    workflowId: 'ndvi-calculation',
    workflowTitle: 'NDVI Calculation',
    scopeLabel: "3 items from saved set 'Field trial plots'",
    workspace: DEMO_WORKSPACE,
    startedAt: now - 26 * 3600 * 1000,
    credits: 9,
    jobs: ['S2B_MSIL2A_20250510', 'S2B_MSIL2A_20250515', 'S2B_MSIL2A_20250520'].map((label) => ({
      id: `run-example-${label}`,
      label,
      durationMs: 60_000,
      fails: false,
    })),
  },
]
