import { fetchWorkspaceTokens } from './workspaceTokenService'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

export interface QuoteRequest {
  workspace: string | undefined
  token: string | undefined
  parentCatalog: 'supported-datasets' | 'commercial'
  catalog: 'planet' | 'airbus'
  collection: string
  item: string
  coordinates?: number[][][]
  licence: string
}

export interface QuoteResponse {
  success: boolean
  data: {
    units: string
    value: number
  }
}

export const fetchQuote = async ({
  workspace,
  token,
  parentCatalog,
  catalog,
  collection,
  item,
  coordinates,
  licence,
}: QuoteRequest): Promise<QuoteResponse> => {
  if (!workspace) {
    throw new Error('Workspace is required for retrieving a quote.')
  }

  if (!token) {
    throw new Error('No token found. You need to be logged in to retrieve a quote')
  }

  const { access } = await fetchWorkspaceTokens({ workspace, token })

  const quoteApiUrl = `${API_URL}/api/catalogue/stac/catalogs/${parentCatalog}/catalogs/${catalog}/collections/${collection}/items/${item}/quote`

  const requestBody: Record<string, unknown> = {}

  if (coordinates) {
    requestBody.coordinates = coordinates
  }

  if (licence) {
    requestBody.licence = licence
  }

  try {
    const response = await fetch(quoteApiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`Quote request failed: ${response.status} ${response.statusText}`)
    }

    const responseData = await response.json()

    return { success: true, data: responseData }
  } catch (error) {
    throw new Error('Failed to fetch quote.')
  }
}
