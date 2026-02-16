import type { PaginatedProcessResponse, ProcessDetail } from '@/types'

const CATALOGUE_ID = 'eodh-workflows-notebooks'

function getBaseUrl(): string {
  const catalogueUrl = import.meta.env.VITE_CATALOGUE_API_URL as string | undefined
  if (catalogueUrl && typeof catalogueUrl === 'string') {
    return catalogueUrl.replace(/\/$/, '')
  }
  const hubUrl = import.meta.env.VITE_HUB_BASE_URL as string | undefined
  if (hubUrl && typeof hubUrl === 'string') {
    return `${hubUrl.replace(/\/$/, '')}/api/v1.0`
  }
  return ''
}

export interface FetchItemsParams {
  page?: number
  pageSize?: number
  q?: string
  type?: 'workflow' | 'notebook'
  applicableCollections?: string
}

export interface FetchItemsResult {
  data: PaginatedProcessResponse | null
  error: string | null
}

export async function fetchItems(params: FetchItemsParams = {}): Promise<FetchItemsResult> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    return { data: null, error: 'Catalogue API URL is not configured.' }
  }

  const { page = 1, pageSize = 20, q, type, applicableCollections } = params
  const searchParams = new URLSearchParams()
  searchParams.set('page', String(page))
  searchParams.set('page_size', String(pageSize))
  if (q) searchParams.set('q', q)
  if (type) searchParams.set('type', type)
  if (applicableCollections) searchParams.set('applicableCollections', applicableCollections)

  const url = `${baseUrl}/collections/${CATALOGUE_ID}/items?${searchParams.toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      if (response.status === 503) {
        return {
          data: null,
          error: 'Catalogue is temporarily unavailable. Please try again later.',
        }
      }
      return {
        data: null,
        error: `Failed to load processes: ${response.status} ${response.statusText}`,
      }
    }

    const data = (await response.json()) as PaginatedProcessResponse
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { data: null, error: `Failed to load processes: ${message}` }
  }
}

export interface FetchItemByIdResult {
  data: ProcessDetail | null
  error: string | null
  notFound: boolean
}

export async function fetchItemById(recordId: string): Promise<FetchItemByIdResult> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    return { data: null, error: 'Catalogue API URL is not configured.', notFound: false }
  }

  const url = `${baseUrl}/collections/${CATALOGUE_ID}/items/${encodeURIComponent(recordId)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (response.status === 404) {
      return { data: null, error: 'Item not found.', notFound: true }
    }

    if (!response.ok) {
      if (response.status === 503) {
        return {
          data: null,
          error: 'Catalogue is temporarily unavailable. Please try again later.',
          notFound: false,
        }
      }
      return {
        data: null,
        error: `Failed to load item: ${response.status} ${response.statusText}`,
        notFound: false,
      }
    }

    const data = (await response.json()) as ProcessDetail
    return { data, error: null, notFound: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { data: null, error: `Failed to load item: ${message}`, notFound: false }
  }
}
