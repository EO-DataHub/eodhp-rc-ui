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
  assets: string | string[]
  title?: string
  rescale?: [number, number][]
  nodata?: number | string
  colormap_name?: string
  colormap?: Record<string, string>
  color_formula?: string
  resampling?: string
  expression?: string
  minmax_zoom?: [number, number]
  bidx?: number[]
}

// The STAC Render Extension does not define an id field, so we add it to make
// it easier to use render options in forms and other elements.
export interface StacRender extends BaseStacRender {
  id: string
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
  renders?: {
    [key: string]: BaseStacRender
  }
}

export interface Item {
  type: string
  stac_version: string
  stac_extensions: string[]
  id: string
  collection: string
  bbox: [number, number, number, number]
  geometry: GeoJSON.Geometry
  properties: {
    datetime: string
    updated: string
    start_datetime: string
    end_datetime: string
    'proj:code': string
    esa_file_name: string
    'Instrument Family Name': string
    'Instrument Family Name Abbreviation': string
    'Platform Number': string
    'NSSDC Identifier': string
    'Start Relative Orbit Number': string
    'Start Orbit Number': string
    'Ground Tracking Direction': string
    'Instrument Mode': string | null
    'eo:cloud_cover': string
    'Product Type': string
    'Datatake Type': string
    data_path: string
    'proj:shape': [number, number]
    'proj:transform': [number, number, number, number, number, number, number, number, number]
    instance_id: string
    created: string
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
  keyword?: string
  timePeriod?: string
  license?: string
}
