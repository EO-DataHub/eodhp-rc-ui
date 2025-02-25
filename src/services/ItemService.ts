import { MapBounds } from '@/pages/DataFinderPage/useFinderStore'
import { Collection, Item } from '@/types'
import { extractCatalogPaths } from '@/library/catalogUtils'

const API_URL = import.meta.env.VITE_HUB_BASE_URL
const HUB_ENV = import.meta.env.VITE_HUB_ENV

interface FetchItemsParams {
  limit: number
  mapBounds?: MapBounds
  aoi?: GeoJSON.Feature
  queryFilter?: object
  selectedCollection?: Collection
}

interface StacQueryBodyParams {
  catalog_paths: string[]
  collections: string[]
  limit: number
  intersects?: GeoJSON.Geometry
  bbox?: MapBounds
}

interface FetchItemParams {
  catalog?: string
  collection?: string
  item?: string
}

export const fetchItems = async ({
  limit,
  mapBounds,
  aoi,
  selectedCollection,
  queryFilter,
}: FetchItemsParams): Promise<Item[]> => {
  const fetchUrl = `${API_URL}/api/catalogue/stac/search`
  const catalogPaths = selectedCollection ? extractCatalogPaths(selectedCollection) : []

  const baseBody: StacQueryBodyParams = {
    catalog_paths: catalogPaths,
    collections: selectedCollection ? [selectedCollection.id] : [],
    limit,
  }

  if (aoi) {
    baseBody.intersects = aoi.geometry
  } else if (mapBounds) {
    baseBody.bbox = mapBounds
  }

  const body = queryFilter ? { ...baseBody, ...queryFilter } : baseBody
  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/geo+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch items')
  }

  const data = await response.json()
  return data.features as Item[]
}

export const fetchItem = async ({ catalog, collection, item }: FetchItemParams): Promise<Item> => {
  if (!item || !collection || !catalog) {
    throw new Error('Item is not valid')
  }

  const url =
    HUB_ENV === 'staging'
      ? `${API_URL}/api/catalogue/stac/catalogs/supported-datasets/catalogs/${catalog}/collections/${collection}/items/${item}`
      : `${API_URL}/api/catalogue/stac/catalogs/supported-datasets/${catalog}/collections/${collection}/items/${item}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Item')
  }

  const data = await response.json()
  return data as Item
}
