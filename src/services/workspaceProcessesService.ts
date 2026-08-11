const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export interface WorkspaceProcess {
  id: string
  title?: string
  description?: string
  mutable?: boolean
  version?: string
  AccessReasoning?: string
}

const OWNING_WORKSPACE_REASON = 'User has access to the owning workspace'

export const fetchWorkspaceProcesses = async (
  workspace: string,
  token: string,
): Promise<WorkspaceProcess[]> => {
  // No trailing slash: the server 307-redirects the trailing-slash form to a
  // plain http:// URL (scheme downgraded), which makes the browser strip the
  // Authorization header on the cross-origin (https->http) redirect it then
  // has to follow. Requesting the exact final form up front avoids that redirect.
  const response = await fetch(
    `${HUB_BASE_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspace}/processes`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch workspace workflows')
  }

  const data = await response.json()
  const processes = (data.processes ?? []) as WorkspaceProcess[]

  return processes.filter((process) => process.AccessReasoning === OWNING_WORKSPACE_REASON)
}
