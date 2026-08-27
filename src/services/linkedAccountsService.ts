const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export type LinkedAccountProvider = 'airbus' | 'planet'

export interface LinkedAccountValidation {
  key: string
  name: string
  contracts?: {
    sar: boolean
    optical: Record<string, string>
  }
}

export interface LinkAccountPayload {
  name: LinkedAccountProvider
  key: string
  contracts?: {
    sar: boolean
    optical: Record<string, string>
  }
}

export const fetchLinkedAccounts = async (
  workspaceId: string,
  token: string,
): Promise<string[]> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspaceId}/linked-accounts`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch linked accounts')
  }

  return (await response.json()) as string[]
}

export const validateLinkedAccountKey = async (
  workspaceId: string,
  token: string,
  provider: LinkedAccountProvider,
  key: string,
): Promise<LinkedAccountValidation> => {
  const response = await fetch(
    `${HUB_BASE_URL}/api/workspaces/${workspaceId}/linked-accounts/${provider}/validate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: provider, key }),
    },
  )

  if (!response.ok) {
    throw new Error('Error validating account, please check your API key')
  }

  return (await response.json()) as LinkedAccountValidation
}

export const linkAccount = async (
  workspaceId: string,
  token: string,
  payload: LinkAccountPayload,
): Promise<void> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspaceId}/linked-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Error linking account')
  }
}

export const unlinkAccount = async (
  workspaceId: string,
  token: string,
  provider: LinkedAccountProvider,
): Promise<void> => {
  const response = await fetch(
    `${HUB_BASE_URL}/api/workspaces/${workspaceId}/linked-accounts/${provider}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Error unlinking account')
  }
}
