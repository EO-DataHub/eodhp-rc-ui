import { useQuery } from '@tanstack/react-query'
import { fetchAccounts } from '@/services/accountService'

export const useAccounts = (token?: string | null, userId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['Accounts', userId],
    queryFn: () => fetchAccounts(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(enabled && token && userId),
  })
}
