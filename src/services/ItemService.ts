import { MapBounds } from '@/pages/DataFinderPage/useFinderStore'
import { Collection, Item } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

interface FetchItemsParams {
  limit: number
  mapBounds?: MapBounds
  aoi?: GeoJSON.Feature
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
  catalog: string
  collection?: string
  item?: string
}

//This fetch is just illustrative; we are retrieving specific items to validate the behavior.
//The search functionality will change with future tickets.
export const fetchItems_org = async ({
  limit,
  mapBounds,
  aoi,
}: FetchItemsParams): Promise<Item[]> => {
  const body = {
    catalog_paths: [],
    collections: ['sentinel2_ard'],
    limit,
  } as StacQueryBodyParams

  if (aoi) {
    body.intersects = aoi.geometry
  } else if (mapBounds) {
    body.bbox = mapBounds
  }

  const response = await fetch(`${API_URL}/api/catalogue/stac/search`, {
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

export const fetchItems = async ({
  limit,
  mapBounds,
  aoi,
  selectedCollection,
}: FetchItemsParams): Promise<Item[]> => {
  const fetchUrl = `${API_URL}/api/catalogue/stac/search`
  let catalogPaths = ['supported-datasets/ceda-stac-catalogue'] // Default fallback for sentinel2_ard

  // extract catalog_paths from selected collection needed for stac search
  if (selectedCollection) {
    const parentLink = selectedCollection.links?.find((link) => link.rel === 'parent')
    if (parentLink?.href) {
      const urlParts = new URL(parentLink.href).pathname.split('/catalogs/')
      if (urlParts.length > 1) {
        catalogPaths = [urlParts[1]]
      }
    }
  }

  const body: StacQueryBodyParams = {
    catalog_paths: catalogPaths,
    collections: selectedCollection ? [selectedCollection.id] : ['sentinel2_ard'],
    limit,
  }

  if (aoi) {
    body.intersects = aoi.geometry
  } else if (mapBounds) {
    body.bbox = mapBounds
  }

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
  if (!item || !collection) {
    throw new Error('Item is not valid')
  }

  const response = await fetch(
    `${API_URL}/api/catalogue/stac/catalogs/supported-datasets/${catalog}/collections/${collection}/items/${item}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch Item')
  }

  const data = await response.json()
  return data as Item
}

// we are retrieving all possible results from the different pages
// this will change with future pagination ticket prev-next page
export const fetchItemsByQueryFilter = async (
  query: object,
  aggregatedFeatures: Item[] = [],
): Promise<Item[]> => {
  try {
    const response = await fetch(`${API_URL}/api/catalogue/stac/search`, {
      method: 'POST',
      headers: {
        Accept: 'application/geo+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })

    const data = await response.json()
    aggregatedFeatures = [...aggregatedFeatures, ...data.features]

    // check for pagination
    const nextLink = data.links?.find((link: { rel: string; href: string }) => link.rel === 'next')

    if (nextLink) {
      return fetchItemsByQueryFilter(nextLink.body, aggregatedFeatures)
    } else {
      return aggregatedFeatures
    }
  } catch (error) {
    throw new Error('Error fetching items by QueryFilter')
  }
}
