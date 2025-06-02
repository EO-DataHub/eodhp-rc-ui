import { Item } from '@/types'
import { fetchWorkspaceTokens } from './workspaceTokenService'

export interface QuoteRequest {
  workspace: string | undefined
  token: string | undefined
  item: Item | undefined
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

  const { access } = await fetchWorkspaceTokens(workspace, token)

  const itemLink = item?.links.find((link) => link.rel === 'self')?.href

  if (!itemLink) {
    throw new Error("No 'self' link found in item.")
  }

  const quoteApiUrl = `${itemLink}/quote`

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
      const errorData = await response.json()
      throw new Error(
        errorData.detail || `Quote request failed: ${response.status} ${response.statusText}`,
      )
    }

    const responseData = await response.json()

    return { success: true, data: responseData }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch quote.')
  }
}
