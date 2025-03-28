import { MapBounds } from '@/pages/DataFinderPage/useFinderStore'
import { Collection, Item } from '@/types'
import { extractCatalogPaths, getCatalog } from '@/library/catalogUtils'
import { bboxToPolygon } from '@/library/geoUtils'

const API_TOKEN = import.meta.env.VITE_WORKSPACE_API_TOKEN

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

interface FetchItemByIdParams {
  collection: Collection
  itemId: string
}

export const fetchItems = async ({
  limit,
  mapBounds,
  aoi,
  selectedCollection,
  queryFilter,
}: FetchItemsParams): Promise<Item[]> => {
  const catalogUrl = selectedCollection ? getCatalog(selectedCollection) : null
  const catalogPaths = selectedCollection ? extractCatalogPaths(selectedCollection) : []
  const fetchUrl = `${catalogUrl}/search`

  const baseBody: StacQueryBodyParams = {
    catalog_paths: catalogPaths,
    collections: selectedCollection ? [selectedCollection.id] : [],
    limit,
  }

  if (aoi) {
    baseBody.intersects = aoi.geometry
  } else if (mapBounds) {
    // Planet proxy doesn’t support search by bbox, so we are using intersects instead.
    if (catalogUrl?.includes('planet')) {
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

export const fetchItemById = async ({ collection, itemId }: FetchItemByIdParams): Promise<Item> => {
  if (!collection || !itemId) {
    throw new Error('Item is not valid')
  }
  const collectionLink = collection.links.find((link) => link.rel === 'self')?.href
  if (!collectionLink) {
    throw new Error("No 'self' link found in item.")
  }
  const itemLink = `${collectionLink}/items/${itemId}`

  const response = await fetch(itemLink, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Item from ${itemLink}`)
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
