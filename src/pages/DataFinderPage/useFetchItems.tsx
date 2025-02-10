import { useQuery } from '@tanstack/react-query'
import { fetchItems, StacCatalogueBbox } from '@/services/ItemService'
import { Item } from '@/types'

export const MAX_TOTAL_ITEMS = 100

interface UseFetchItemsParams {
  bbox: StacCatalogueBbox | null
}

export const useFetchItems = ({ bbox }: UseFetchItemsParams) => {
  return useQuery<Item[], Error>({
    queryKey: ['Items', bbox?.toString()],
    queryFn: () => fetchItems({ limit: MAX_TOTAL_ITEMS + 1, bbox }), // Fetch one more than the max to see if there are more items
    refetchOnWindowFocus: false,
    enabled: bbox !== null,
  })
}
