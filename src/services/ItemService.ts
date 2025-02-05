import { Item } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

export type StacCatalogueBbox = [number, number, number, number]

interface FetchItemsParams {
  limit: number
  bbox: StacCatalogueBbox | null
}

//This fetch is just illustrative; we are retrieving specific items to validate the behavior.
//The search functionality will change with future tickets.
export const fetchItems = async ({ limit, bbox }: FetchItemsParams): Promise<Item[]> => {
  // This is a simple way to clip the bbox to the valid range of [-180, -90, 180, 90]
  const bboxClipped = [
    Math.max(-180, bbox?.[0] ?? -180),
    Math.max(-90, bbox?.[1] ?? -90),
    Math.min(180, bbox?.[2] ?? 180),
    Math.min(90, bbox?.[3] ?? 90),
  ]

  const response = await fetch(`${API_URL}/api/catalogue/stac/search`, {
    method: 'POST',
    headers: {
      Accept: 'application/geo+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      catalog_paths: ['supported-datasets/ceda-stac-catalogue'],
      collections: ['sentinel2_ard'],
      limit,
      bbox: bboxClipped,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch items')
  }

  const data = await response.json()
  return data.features as Item[]
}
