export interface Catalog {
  type: string
  stac_version: string
  id: string
  title?: string
  description?: string
  links: {
    rel: string
    type: string
    href: string
    method?: string
    title?: string
  }[]
  stac_extensions: string[]
  conformsTo: string[]
}

export interface BaseStacRender {
  title: string
  assets: string[]
  rescale?: [number, number][] | number[]
  nodata?: number | string
  colormap_name?: string
  colormap?: Record<string, string>
  color_formula?: string
  resampling?: string
  expression?: string
  minmax_zoom?: [number, number]
  bidx?: number[]
  // the following fields are not part of the STAC Render Extension
  variable?: string
  tileMatrixSetId?: string
  scale?: number
  multiscale?: boolean
  reference?: boolean
  decode_times?: boolean
  consolidated?: boolean
  return_mask?: boolean
  quicklook_georeference?: string
  auth?: boolean
}

// The STAC Render Extension does not define an id field, so we add it to make
// it easier to use render options in forms and other elements.
export interface StacRender extends BaseStacRender {
  id: string
  auth?: boolean
}

export interface Collection {
  type: string
  stac_version: string
  stac_extensions?: string[]
  id: string
  title?: string
  description: string
  links: {
    rel: string
    type?: string
    href: string
    method?: string
    title?: string
  }[]
  keywords?: string[]
  license: string
  providers?: {
    name: string
    roles?: string[]
    url?: string
  }[]
  extent: {
    spatial: {
      bbox: number[][]
    }
    temporal: {
      interval: (string | null)[][]
    }
  }
  summaries?: { [key: string]: string[] }
  assets?: {
    [key: string]: {
      href: string
      title?: string
      type?: string
      roles?: string[]
    }
  }
  'eodhrc:time-variable-items'?: boolean
  'eodhrc:render-key-properties'?: string[]
  renders?: {
    [key: string]: BaseStacRender
  }
  // unique key to differentiate between public collections and user collections
  isUserCollection?: boolean
  // flag to differentiate job collections from processing results
  isJobCollection?: boolean
  displayedTitle?: string
}

export type ItemCardType = 'query-item' | 'pinned-item'

export interface Item {
  type: string
  stac_version: string
  stac_extensions: string[]
  id: string
  pinId?: string
  collection: string
  bbox: [number, number, number, number]
  geometry: GeoJSON.Geometry
  properties: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
    datetime?: string
    created?: string
    'order:status'?: string
    'order:id'?: string
    'order:date'?: string
    order_options?: {
      productBundle?: string
      endUser?: {
        country?: string | null
        endUserName?: string
      }
      licence?: string
      coordinates?: number[][][]
    }
  }
  links: {
    rel: string
    type: string
    href: string
    method?: string
  }[]
  assets: {
    thumbnail: {
      href: string
      roles: string[]
      size: number
      location: string
    }
    [key: string]: {
      href: string
      roles: string[]
      size: number
      location: string
      'eo:bands'?: {
        'eo:central_wavelength': number
        'eo:common_name': string
        description: string
        'eo: full_width_half_max': number
        name: string
      }[]
    }
  }
  tilesUrl: string | undefined
  render?: StacRender
  mapRender?: {
    visible: boolean
    opacity: number
  }
  isUserCollection?: boolean
  isLicenseProprietary?: boolean
  collectionName?: string
  collectionRef?: Collection
}

export interface DownloadableAsset {
  href: string
  roles?: string[]
}

export interface CubeData {
  [key: string]: { [key: string]: string | number | string[] | number[] }
}

export interface MetadataProperties {
  label: string
  formatted: string
  value: string | number | CubeData
  spec: {
    label?: string
    explain?: string
  }
  itemOrder?: string[]
  items?: { [key: string]: { label: string; order: number } }
}

export interface MetadataItem {
  extension: string
  properties: { [key: string]: MetadataProperties }
  label?: string
}

export interface QuickFilter {
  dataCategory?: string
  resolution?: string
  provider?: string
  location?: string
  timePeriod?: string
  license?: string
  qa?: string
}

// OGC API Records – Process Catalogue (workflows/notebooks)
export interface ProcessRecord {
  id: string
  type: string
  properties: {
    type: 'workflow' | 'notebook'
    title: string
    description: string | null
    keywords?: string[]
    created?: string
    updated?: string
    applicableCollections?: string[]
    contacts?: unknown[]
  }
}

/** Single input parameter entry from process catalogue (e.g. for notebooks). Used for variable form UI. */
export interface InputParameterEntry {
  type?: string
  label?: string
  description?: string
  default?: unknown
  variableRef?: string // Platform variable name to resolve (e.g., "STAC_ITEM_LINK", "STAC_COLLECTION_NAME", "AOI")
}

export interface ProcessDetail extends ProcessRecord {
  links?: { href: string; rel: string; type?: string; title?: string }[]
  properties: ProcessRecord['properties'] & {
    contacts?: { name: string; organization?: string; roles?: string[] }[]
    inputParameters?: Record<string, InputParameterEntry>
  }
}

export interface PaginatedProcessResponse {
  items: ProcessRecord[]
  total_items: number
  page: number
  total_pages: number
  page_size: number
}

export interface DocumentQA {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    stac_version: string
    stac_extensions: string[]
    id: string
    collection: string
    bbox: [number, number, number, number]
    geometry: GeoJSON.Geometry
    properties: {
      [key: string]: never
    }
    links: {
      rel: string
      type: string
      href: string
    }[]
    assets: {
      [key: string]: {
        roles?: string[]
        description?: string
        href: string
        type?: string
        title?: string
      }
    }
  }[]
  links: {
    rel: string
    type: string
    href: string
  }[]
  numReturned: number
  numMatched: number
}

export type DocumentQAMetric =
  | 'not assessed'
  | 'not assessable'
  | 'basic'
  | 'good'
  | 'excellent'
  | 'ideal'
  | 'not_public'

export interface DocumentQAOutput {
  data_collection: string
  data_id_field: string
  uuid: string
  check_name: string
  results: {
    product_information: {
      [key: string]: {
        metric: DocumentQAMetric
        value: string
        links: {
          rel: string
          type: string
          href: string
          title: string
        }[]
      }
    }
    metrology: {
      [key: string]: {
        metric: DocumentQAMetric
        value: string
        links: {
          rel: string
          type: string
          href: string
          title: string
        }[]
      }
    }
    product_generation: {
      [key: string]: {
        metric: DocumentQAMetric
        value: string
        links: {
          rel: string
          type: string
          href: string
          title: string
        }[]
      }
    }
  }
  result_vocab: string
  check_datetime: string
  check_datetime_validity_start: string
  check_datetime_validity_end: string
  check_creator: string
  contact_point: string
  publisher: string
  eodh_qa_check_version: number
}

export interface DocumentRadiometricOutput {
  data_collection: string
  data_id_field: string
  uuid: string
  check_name: string
  results: {
    'data validation': {
      'radiometric uncertainty': {
        metric: string
        value: [string, string[]]
        stated_value: string[]
        links: {
          rel: string
          type: string
          href: string
          title: string
        }[]
      }
    }
  }
  result_vocab: {
    pass: string
    'partial pass': string
    fail: string
  }
  check_datetime: string
  check_datetime_validity_start: string
  check_datetime_validity_end: string
  check_creator: string
  contact_point: string
  publisher: string
  eodh_qa_check_version: number
}

// Workflow Job Types
export interface JobLink {
  title?: string
  rel: string
  type?: string
  href: string
}

export interface WorkflowJob {
  id: string
  jobID: string
  type: 'process'
  processID: string
  // Optional client-side annotation to record which workspace a job belongs to
  workspace?: string
  created: string
  started: string
  finished: string | null
  updated: string
  status: 'successful' | 'failed' | 'running'
  message: string
  links: JobLink[]
}

export interface JobsApiResponse {
  jobs: WorkflowJob[]
  links: JobLink[]
  numberTotal: number
}

export interface WorkflowJobFilterState {
  selectedWorkspace: string
  selectedStatus: 'all' | 'successful' | 'failed' | 'running'
  searchText: string
}

export interface WorkflowJobDisplayData {
  id: string
  processID: string
  status: 'successful' | 'failed' | 'running'
  createdDate: Date
  finishedDate: Date | null
  createdFormatted: string
  finishedFormatted: string
  workspace: string
}
