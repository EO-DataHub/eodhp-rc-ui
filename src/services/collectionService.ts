import { Collection, DocumentQA } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

if (!API_URL) {
  throw new Error(
    'Missing required environment variable: VITE_HUB_BASE_URL. ' +
      'Please ensure this is set in your GitHub environment configuration or .env file.',
  )
}

export const fetchCollections = async (catalog: string, limit = 20): Promise<Collection[]> => {
  const url = `${API_URL}/api/catalogue/stac/catalogs/${catalog}/collections?limit=${limit}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data.collections as Collection[]
}

export const fetchUserCollections = async (
  workspace: string,
  workspace_token: string,
): Promise<Collection[]> => {
  if (!workspace) {
    throw new Error('Workspace is required for fetch user collections.')
  }
  if (!workspace_token) {
    throw new Error('Workspace_token is required for fetch user collections.')
  }

  const url = `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspace}/catalogs/commercial-data/collections`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${workspace_token}`,
    },
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data.collections as Collection[]
}

export const fetchDocumentQA = async (catalog: string | null, collection: string) => {
  const url = `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/npl/catalogs/processing-results/catalogs/qa-workflow/catalogs/${catalog}/collections/${collection}/items`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user Collections')
  }

  const data = await response.json()
  return data as DocumentQA
}
