const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export interface WorkspaceMember {
  username: string
  firstName?: string
  lastName?: string
  email?: string
}

export const fetchWorkspaceMembers = async (
  workspace: string,
  token: string,
): Promise<WorkspaceMember[]> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspace}/users`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch workspace members: ${response.status} ${response.statusText}`)
  }

  const members = await response.json()

  if (!Array.isArray(members)) {
    throw new Error('Unexpected response format when fetching workspace members.')
  }

  return members as WorkspaceMember[]
}

export const addWorkspaceMember = async (
  workspace: string,
  token: string,
  username: string,
): Promise<void> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspace}/users/${username}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to add member: ${response.status} ${response.statusText}`)
  }
}

export const deleteWorkspaceMember = async (
  workspace: string,
  token: string,
  username: string,
): Promise<void> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspace}/users/${username}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to remove member: ${response.status} ${response.statusText}`)
  }
}
