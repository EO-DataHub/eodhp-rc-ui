import { Collection } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL
const API_TOKEN = import.meta.env.VITE_WORKSPACE_API_TOKEN
const HUB_ENV = import.meta.env.VITE_HUB_ENV

export const fetchCollections = async (catalog: string, limit = 20): Promise<Collection[]> => {
  const url =
    HUB_ENV === 'staging'
      ? `${API_URL}/api/catalogue/stac/catalogs/supported-datasets/catalogs/${catalog}/collections?limit=${limit}`
      : `${API_URL}/api/catalogue/stac/catalogs/supported-datasets/${catalog}/collections?limit=${limit}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Collections')
  }

  const data = await response.json()
  return data.collections as Collection[]
}

export const fetchUserCollections = async (workspace: string): Promise<Collection[]> => {
  if (!workspace) {
    throw new Error('Workspace is required for fetch user collections.')
  }

  const url = `${API_URL}/api/catalogue/stac/catalogs/user-datasets/catalogs/${workspace}/catalogs/commercial-data/collections`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user Collections')
  }

  const data = await response.json()
  return data.collections as Collection[]
}
