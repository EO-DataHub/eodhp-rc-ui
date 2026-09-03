import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'

export const useWorkspaceToken = (
  workspace?: string | null,
  token?: string | null,
  userId?: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['WorkspaceTokens', workspace, userId],
    queryFn: () => fetchWorkspaceTokens(workspace!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(enabled && workspace && token && userId),
  })
}
