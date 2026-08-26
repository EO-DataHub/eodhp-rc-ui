import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaces } from '@/services/workspaceTokenService'

export const useWorkspaces = (token?: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['Workspaces', token],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(enabled && token),
  })
}
