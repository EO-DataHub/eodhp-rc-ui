import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaces } from '@/services/workspaceTokenService'

export const useWorkspaces = (token?: string | null, userId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['Workspaces', userId],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(enabled && token && userId),
  })
}
