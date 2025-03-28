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
