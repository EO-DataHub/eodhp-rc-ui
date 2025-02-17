import { MapBounds } from '@/pages/DataFinderPage/useFinderStore'
import { Item } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

interface FetchItemsParams {
  limit: number
  mapBounds?: MapBounds
  aoi?: GeoJSON.Feature
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

//This fetch is just illustrative; we are retrieving specific items to validate the behavior.
//The search functionality will change with future tickets.
export const fetchItems = async ({ limit, mapBounds, aoi }: FetchItemsParams): Promise<Item[]> => {
  const body = {
    catalog_paths: ['supported-datasets/ceda-stac-catalogue'],
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

export const fetchItem = async ({ catalog, collection, item }: FetchItemParams): Promise<Item> => {
  if (!item || !collection || !catalog) {
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
