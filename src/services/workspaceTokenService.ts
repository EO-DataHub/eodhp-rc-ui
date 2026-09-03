const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

interface WorkspaceScopedTokenResponse {
  access: string
  accessExpiry: string
  refresh: string
  refreshExpiry: string
  scope: string
}

export const fetchWorkspaceTokens = async (
  workspace: string,
  token: string,
): Promise<WorkspaceScopedTokenResponse> => {
  try {
    const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspace}/me/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Scoped Token Request Failed: ${response.status} ${response.statusText}`)
    }

    const workspaceTokens = await response.json()

    return workspaceTokens as WorkspaceScopedTokenResponse
  } catch (error) {
    throw new Error('Failed to request scoped tokens')
  }
}

export interface Workspace {
  id: string
  name: string
  account: string
  member_group: string
  status: string
  last_updated: string
  stores: object[]
}

export const fetchWorkspaces = async (token?: string | null): Promise<Workspace[]> => {
  if (!token) return []
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch workspaces')
  }

  const workspaces = await response.json()

  return workspaces as Workspace[]
}

export interface CreateWorkspacePayload {
  name: string
  account: string
}

export const createWorkspace = async (
  payload: CreateWorkspacePayload,
  token: string,
): Promise<Workspace> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(
        'A workspace with this name already exists. Please choose a different unique name.',
      )
    }
    if (response.status === 500) {
      throw new Error(
        'Server error. Try again later or email enquiries@eodatahub.org.uk if this continues.',
      )
    }
    throw new Error(`Failed to create workspace: ${response.status} ${response.statusText}`)
  }

  const workspace = await response.json()

  return workspace as Workspace
}
