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
  // new URL() handles both absolute URLs (ignores base) and relative URLs (uses base)
  const baseUrl =
    itemsLink.startsWith('http://') || itemsLink.startsWith('https://')
      ? itemsLink
      : `${window.location.protocol}//${window.location.host}${itemsLink}`
  const url = new URL(baseUrl)
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

export interface ItemsWithMetadata {
  items: Item[]
  numMatched: number | null
  numReturned: number
  hasMore: boolean
  nextUrl: string | null
}

export const fetchUserItemsByParams = async (
  workspace: string,
  collectionId: string,
  catalogPath: string,
  workspaceToken: string,
  limit = 10000,
): Promise<Item[]> => {
  const result = await fetchUserItemsByParamsWithMetadata(
    workspace,
    collectionId,
    catalogPath,
    workspaceToken,
    limit,
  )
  return result.items
}

/**
 * Fetches items starting from a specific pagination URL
 * Used for progressive loading when fetching more items
 */
export const fetchUserItemsFromUrl = async (
  nextUrl: string,
  workspaceToken: string,
  limit = 200,
): Promise<ItemsWithMetadata> => {
  const allItems: Item[] = []
  let numMatched: number | null = null
  let finalNextUrl: string | null = null
  let currentUrl: string | null = nextUrl

  while (currentUrl && allItems.length < limit) {
    const response = await fetch(currentUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workspaceToken}`,
      },
    })

    if (!response.ok) {
      return {
        items: allItems.length > 0 ? allItems : [],
        numMatched,
        numReturned: allItems.length,
        hasMore: false,
        nextUrl: null,
      }
    }

    const data: {
      features: Item[]
      links?: { rel: string; href: string }[]
      numReturned?: number
      numMatched?: number
    } = await response.json()

    const features = data.features || []
    allItems.push(...features)

    // Track metadata from the first response
    if (numMatched === null && data.numMatched !== undefined) {
      numMatched = data.numMatched
    }

    // Check for pagination link
    const nextLink: { rel: string; href: string } | undefined = data.links?.find(
      (link: { rel: string }) => link.rel === 'next',
    )
    if (nextLink && allItems.length < limit) {
      // Handle both absolute and relative URLs
      const apiUrl = import.meta.env.VITE_HUB_BASE_URL
      currentUrl =
        nextLink.href.startsWith('http://') || nextLink.href.startsWith('https://')
          ? nextLink.href
          : `${apiUrl}${nextLink.href}`
      finalNextUrl = currentUrl
    } else {
      currentUrl = null
      finalNextUrl = null
    }
  }

  // Determine if there are more items available
  // hasMore should be true if numMatched indicates more items, even if nextUrl is null
  // (nextUrl might be null if we hit the limit exactly, but we can reconstruct the URL)
  const hasMore = numMatched !== null && allItems.length < numMatched

  return {
    items: allItems.slice(0, limit),
    numMatched,
    numReturned: allItems.length,
    hasMore,
    nextUrl: finalNextUrl,
  }
}

export const fetchUserItemsByParamsWithMetadata = async (
  workspace: string,
  collectionId: string,
  catalogPath: string,
  workspaceToken: string,
  limit = 10000,
): Promise<ItemsWithMetadata> => {
  if (!workspace) {
    throw new Error('Workspace is required for fetch user items.')
  }
  if (!workspaceToken) {
    throw new Error('Workspace_token is required for fetch user items.')
  }
  if (!collectionId) {
    throw new Error('Collection ID is required for fetch user items.')
  }

  const baseUrl = `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspace}/catalogs/commercial-data/catalogs/${catalogPath}/collections/${collectionId}/items`

  // Add limit parameter to the initial URL
  // Handle both absolute URLs (ignores base) and relative URLs (uses base)
  const urlString =
    baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
      ? baseUrl
      : `${window.location.protocol}//${window.location.host}${baseUrl}`
  const url = new URL(urlString)
  url.searchParams.set('limit', limit.toString())
  let nextUrl: string | null = url.toString()

  const allItems: Item[] = []
  let numMatched: number | null = null
  let finalNextUrl: string | null = null

  while (nextUrl && allItems.length < limit) {
    const response = await fetch(nextUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workspaceToken}`,
      },
    })

    if (!response.ok) {
      // If we've already fetched some items, return what we have
      // Otherwise, return empty array
      return {
        items: allItems.length > 0 ? allItems : [],
        numMatched,
        numReturned: allItems.length,
        hasMore: false,
        nextUrl: null,
      }
    }

    const data: {
      features: Item[]
      links?: { rel: string; href: string }[]
      numReturned?: number
      numMatched?: number
    } = await response.json()

    const features = data.features || []
    allItems.push(...features)

    // Track metadata from the first response
    if (numMatched === null && data.numMatched !== undefined) {
      numMatched = data.numMatched
    }

    // Check for pagination link
    // Important: Check for next link even if we've hit the limit, as there might be more items
    const nextLink: { rel: string; href: string } | undefined = data.links?.find(
      (link: { rel: string }) => link.rel === 'next',
    )
    if (nextLink) {
      // Handle both absolute and relative URLs
      const nextUrlString =
        nextLink.href.startsWith('http://') || nextLink.href.startsWith('https://')
          ? nextLink.href
          : `${API_URL}${nextLink.href}`
      // Only continue fetching if we haven't hit the limit yet
      if (allItems.length < limit) {
        nextUrl = nextUrlString
      }
      // Always store the nextUrl for future fetches, even if we've hit our limit
      finalNextUrl = nextUrlString
    } else {
      // No next link - check if we should stop
      if (allItems.length >= limit) {
        nextUrl = null
      } else {
        // No next link and we haven't hit limit - we're done
        nextUrl = null
        finalNextUrl = null
      }
    }
  }

  // Determine if there are more items available
  // hasMore should be true if numMatched indicates more items, even if nextUrl is null
  // (nextUrl might be null if we hit the limit exactly, but we can reconstruct the URL)
  const hasMore = numMatched !== null && allItems.length < numMatched

  // Return items up to the limit with metadata
  return {
    items: allItems.slice(0, limit),
    numMatched,
    numReturned: allItems.length,
    hasMore,
    nextUrl: finalNextUrl,
  }
}
