import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSkus } from '@/services/accountingService'

export const useSkusBySku = (token?: string | null, userId?: string) => {
  const { data: skus } = useQuery({
    queryKey: ['BillingSkus', userId],
    queryFn: () => fetchSkus(token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  return useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>()
    skus?.forEach((sku) => map.set(sku.sku, { name: sku.name, unit: sku.unit }))
    return map
  }, [skus])
}
