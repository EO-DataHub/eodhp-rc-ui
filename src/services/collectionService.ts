import { Collection } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

export const fetchCollections = async (): Promise<Collection[]> => {
  const response = await fetch(
    `${API_URL}/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections`,
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
