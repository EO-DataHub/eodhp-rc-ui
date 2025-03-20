import { MapBounds } from '@/pages/DataFinderPage/useFinderStore'
import { Collection, Item } from '@/types'
import { extractCatalogPaths, getCatalog } from '@/library/catalogUtils'
import { bboxToPolygon } from '@/library/geoUtils'

const API_URL = import.meta.env.VITE_HUB_BASE_URL
const API_TOKEN = import.meta.env.VITE_WORKSPACE_API_TOKEN
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
  const catalog = selectedCollection ? getCatalog(selectedCollection) : null
  const fetchUrl =
    HUB_ENV === 'staging' && catalog
      ? `${API_URL}/api/catalogue/stac/catalogs/supported-datasets/catalogs/${catalog}/search`
      : `${API_URL}/api/catalogue/stac/search`

  const catalogPaths = selectedCollection ? extractCatalogPaths(selectedCollection) : []

  const baseBody: StacQueryBodyParams = {
    catalog_paths: catalogPaths,
    collections: selectedCollection ? [selectedCollection.id] : [],
    limit,
  }

  if (aoi) {
    baseBody.intersects = aoi.geometry
  } else if (mapBounds) {
    // Planet proxy doesn’t support search by bbox, so we are using intersects instead.
    if (catalog === 'planet') {
      baseBody.intersects = bboxToPolygon(mapBounds)
    } else {
      baseBody.bbox = mapBounds
    }
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

export const fetchUserItems = async (selectedCollection: Collection): Promise<Item[]> => {
  const itemsLink = selectedCollection.links.find((link) => link.rel === 'items')?.href
  if (!itemsLink) {
    throw new Error("No 'items' link found in user collection.")
  }

  const response = await fetch(itemsLink, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user items')
  }

  const data = await response.json()
  return data.features as Item[]
}
