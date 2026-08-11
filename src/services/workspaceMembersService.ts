const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export interface WorkspaceMember {
  username: string
  firstName?: string
  lastName?: string
  email?: string
}

export const fetchWorkspaceMembers = async (
  workspaceId: string,
  token: string,
): Promise<WorkspaceMember[]> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspaceId}/users`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch workspace members')
  }

  const data = await response.json()
  return data as WorkspaceMember[]
}

export const addWorkspaceMember = async (
  workspaceId: string,
  token: string,
  username: string,
): Promise<void> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspaceId}/users/${username}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to add workspace member')
  }
}

export const deleteWorkspaceMember = async (
  workspaceId: string,
  token: string,
  username: string,
): Promise<void> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspaceId}/users/${username}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to remove workspace member')
  }
}
