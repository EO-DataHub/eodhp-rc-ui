import { getTokensBaseUrl } from './apiUrlUtils'

const TOKENS_BASE_URL = getTokensBaseUrl()

export interface DataHubToken {
  id: string
  name: string
  scope: string
  created: string
  expiry: string
  token?: string
}

export const listDataHubTokens = async (
  workspaceId: string,
  token: string,
): Promise<DataHubToken[]> => {
  const response = await fetch(`${TOKENS_BASE_URL}/api/workspaces/${workspaceId}/me/tokens`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch DataHub API tokens')
  }

  const data = await response.json()
  return data as DataHubToken[]
}

export const createDataHubToken = async (
  workspaceId: string,
  token: string,
  name: string,
  expiresDays: number,
): Promise<DataHubToken> => {
  const response = await fetch(`${TOKENS_BASE_URL}/api/workspaces/${workspaceId}/me/tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, expires: expiresDays }),
  })

  if (!response.ok) {
    throw new Error('Failed to create DataHub API token')
  }

  const data = await response.json()
  return data as DataHubToken
}

export const deleteDataHubToken = async (
  workspaceId: string,
  token: string,
  tokenId: string,
): Promise<void> => {
  const response = await fetch(
    `${TOKENS_BASE_URL}/api/workspaces/${workspaceId}/me/tokens/${tokenId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to delete DataHub API token')
  }
}
