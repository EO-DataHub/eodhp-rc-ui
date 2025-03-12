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
    [key: string]: never
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
