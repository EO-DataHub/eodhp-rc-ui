import { MapBounds } from '@/pages/DataFinderPage/useFinderStore'
import { Collection, Item } from '@/types'
import { extractCatalogPaths, getCatalog } from '@/library/catalogUtils'
import { bboxToPolygon } from '@/library/geoUtils'

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
  collectionUrl?: string
  itemId?: string
}

interface FetchItemFromCollectionParams {
  catalogUrl?: string
  collectionId?: string
  itemId?: string
}

export const fetchItems = async ({
  limit,
  mapBounds,
  aoi,
  selectedCollection,
  queryFilter,
}: FetchItemsParams): Promise<Item[]> => {
  const catalog = selectedCollection ? getCatalog(selectedCollection) : null
  const fetchUrl = `${catalog}/search`

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

export const fetchItemFromCollection = async ({
  catalogUrl,
  collectionId,
  itemId,
}: FetchItemFromCollectionParams): Promise<Item> => {
  if (!itemId || !collectionId || !catalogUrl) {
    throw new Error('Item is not valid')
  }
  const collectionUrl = `${catalogUrl}/collections/${collectionId}`
  return fetchItem({ collectionUrl, itemId })
}

export const fetchItem = async ({ collectionUrl, itemId }: FetchItemParams): Promise<Item> => {
  if (!itemId || !collectionUrl) {
    throw new Error('Item is not valid')
  }
  const url = `${collectionUrl}/items/${itemId}`

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

export const fetchUserItems = async (
  selectedCollection: Collection,
  workspace_token: string,
): Promise<Item[]> => {
  const itemsLink = selectedCollection.links.find((link) => link.rel === 'items')?.href
  if (!itemsLink) {
    throw new Error("No 'items' link found in user collection.")
  }
  if (!workspace_token) {
    throw new Error('Workspace_token is required for fetch user items.')
  }

  const response = await fetch(itemsLink, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${workspace_token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user items')
  }

  const data = await response.json()
  return data.features as Item[]
}
