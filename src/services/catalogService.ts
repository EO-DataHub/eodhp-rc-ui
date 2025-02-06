import { Catalog } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

export const fetchCatalogs = async (): Promise<Catalog[]> => {
  const response = await fetch(`${API_URL}/api/catalogue/stac/catalogs`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch catalogs')
  }

  const data = await response.json()
  return data.catalogs as Catalog[]
}
