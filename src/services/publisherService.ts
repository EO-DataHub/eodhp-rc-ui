const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export interface HarvestLogEntry {
  datetime: string
  message: string
  level: string
}

export const fetchHarvestLogs = async (
  workspaceId: string,
  token: string,
): Promise<HarvestLogEntry[]> => {
  const response = await fetch(`${HUB_BASE_URL}/workspaces/${workspaceId}/harvest_logs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch harvest logs')
  }

  const data = await response.json()
  return (data.messages ?? []) as HarvestLogEntry[]
}
