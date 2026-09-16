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

// The admin endpoints return error bodies as a bare JSON-encoded string
// (e.g. "User must be a member of the workspace before being granted admin
// status"), not `{ message }`/`{ error }`, so extract that string for a more
// useful error message where the backend provides one.
const extractErrorMessage = async (response: Response): Promise<string | undefined> => {
  try {
    const text = await response.text()
    if (!text) return undefined
    const parsed = JSON.parse(text)
    return typeof parsed === 'string' ? parsed : undefined
  } catch {
    return undefined
  }
}

export const fetchWorkspaceAdmins = async (workspace: string, token: string): Promise<string[]> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspace}/admins`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch workspace admins: ${response.status} ${response.statusText}`)
  }

  const admins = await response.json()

  if (!Array.isArray(admins)) {
    throw new Error('Unexpected response format when fetching workspace admins.')
  }

  return admins as string[]
}

export const grantWorkspaceAdmin = async (
  workspace: string,
  token: string,
  username: string,
): Promise<void> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspace}/admins/${username}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const message = await extractErrorMessage(response)
    throw new Error(
      message ?? `Failed to grant admin status: ${response.status} ${response.statusText}`,
    )
  }
}

export const revokeWorkspaceAdmin = async (
  workspace: string,
  token: string,
  username: string,
): Promise<void> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspace}/admins/${username}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const message = await extractErrorMessage(response)
    throw new Error(
      message ?? `Failed to revoke admin status: ${response.status} ${response.statusText}`,
    )
  }
}
