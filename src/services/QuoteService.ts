const API_URL = import.meta.env.VITE_HUB_BASE_URL
const API_TOKEN = import.meta.env.VITE_WORKSPACE_API_TOKEN

export interface QuoteRequest {
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
  parentCatalog,
  catalog,
  collection,
  item,
  coordinates,
  licence,
}: QuoteRequest): Promise<QuoteResponse> => {
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
        Authorization: `Bearer ${API_TOKEN}`,
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
