import { MapBounds } from '@/pages/DataFinderPage/useFinderStore'
import { Collection, Item } from '@/types'
import { extractCatalogPaths, getCatalog } from '@/library/catalogUtils'
import { bboxToPolygon } from '@/library/geoUtils'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

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
  limit = 10000,
): Promise<Item[]> => {
  const itemsLink = selectedCollection.links.find((link) => link.rel === 'items')?.href
  if (!itemsLink) {
    throw new Error("No 'items' link found in user collection.")
  }
  if (!workspace_token) {
    throw new Error('Workspace_token is required for fetch user items.')
  }

  const allItems: Item[] = []
  let nextUrl: string | null = itemsLink

  // Add limit parameter to the initial URL
  const url = new URL(nextUrl, window.location.origin)
  url.searchParams.set('limit', limit.toString())
  nextUrl = url.toString()

  while (nextUrl && allItems.length < limit) {
    const response: Response = await fetch(nextUrl, {
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

    const data: { features: Item[]; links?: { rel: string; href: string }[] } =
      await response.json()
    const features = data.features
    allItems.push(...features)

    // Check for pagination link
    const nextLink: { rel: string; href: string } | undefined = data.links?.find(
      (link: { rel: string }) => link.rel === 'next',
    )
    if (nextLink && allItems.length < limit) {
      nextUrl = nextLink.href
    } else {
      nextUrl = null
    }
  }

  // Return items up to the limit
  return allItems.slice(0, limit)
}

export const fetchUserItemsByParams = async (
  workspace: string,
  collectionId: string,
  catalogPath: string,
  workspaceToken: string,
): Promise<Item[]> => {
  if (!workspace) {
    throw new Error('Workspace is required for fetch user items.')
  }
  if (!workspaceToken) {
    throw new Error('Workspace_token is required for fetch user items.')
  }
  if (!collectionId) {
    throw new Error('Collection ID is required for fetch user items.')
  }

  const url = `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspace}/catalogs/commercial-data/catalogs/${catalogPath}/collections/${collectionId}/items`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${workspaceToken}`,
    },
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data.features as Item[]
}
