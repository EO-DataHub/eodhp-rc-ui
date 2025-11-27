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
  quicklook_bbox?: string
  remove_black_background?: boolean
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
