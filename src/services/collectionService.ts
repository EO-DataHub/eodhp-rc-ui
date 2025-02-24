import { Collection } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

export const fetchCollections = async (catalog: string, limit = 20): Promise<Collection[]> => {
  const response = await fetch(
    `${API_URL}/api/catalogue/stac/catalogs/supported-datasets/${catalog}/collections?limit=${limit}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch Collections')
  }

  const data = await response.json()
  return data.collections as Collection[]
}
