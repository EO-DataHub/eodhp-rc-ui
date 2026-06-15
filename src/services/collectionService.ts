import { Collection } from '@/types'
import serverConfig from '@/library/configFromServer.json'

const API_URL = import.meta.env.VITE_HUB_BASE_URL
const EXTERNAL_STAC_COLLECTION_ALLOWLIST = new Set(Object.keys(serverConfig))

export async function fetchCollectionQAJsonAsset<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch collection QA asset: ${response.status} ${response.statusText}`,
    )
  }

  return response.json() as Promise<T>
}

export const fetchCollections = async (catalog: string, limit = 20): Promise<Collection[]> => {
  const isExternalCatalog = catalog.startsWith('http://') || catalog.startsWith('https://')
  const url = isExternalCatalog
    ? `${catalog}/collections?limit=${limit}`
    : `${API_URL}/api/catalogue/stac/catalogs/${catalog}/collections?limit=${limit}`

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
  const collections = data.collections as Collection[]

  // External STAC catalogs are allowlisted by local rendering config.
  return isExternalCatalog
    ? collections.filter((collection) => EXTERNAL_STAC_COLLECTION_ALLOWLIST.has(collection.id))
    : collections
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

export const fetchJobCollection = async (
  workspace: string,
  jobPath: string,
  workspace_token: string,
): Promise<Collection | null> => {
  if (!workspace) {
    throw new Error('Workspace is required for fetch job collection.')
  }
  if (!workspace_token) {
    throw new Error('Workspace_token is required for fetch job collection.')
  }
  if (!jobPath) {
    throw new Error('Job path is required for fetch job collection.')
  }

  // Construct URL: /api/catalogue/stac/catalogs/user/catalogs/{workspace}/catalogs/processing-results/catalogs/{jobPath}
  // Remove leading "catalogs/" from jobPath if present, as it's already in the URL structure
  const cleanJobPath = jobPath.startsWith('catalogs/')
    ? jobPath.replace(/^catalogs\//, '')
    : jobPath
  const url = `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspace}/catalogs/processing-results/catalogs/${cleanJobPath}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${workspace_token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`Failed to fetch job collection: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const collection = data as Collection
  // Mark as job collection
  collection.isJobCollection = true
  return collection
}
