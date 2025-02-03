import React from 'react'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { useQuery } from '@tanstack/react-query'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { fetchItems } from '@/services/ItemService'
import { Item } from '@/types'
import styles from './DataFinderPage.module.scss'

export const MAX_TOTAL_ITEMS = 100
export const PAGE_SIZE = 10
export const PAGE_COUNT = MAX_TOTAL_ITEMS / PAGE_SIZE

export const DataFinderPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['Items'],
    queryFn: () => fetchItems({ limit: MAX_TOTAL_ITEMS + 1 }), // Fetch one more than the max to see if there are more items
    refetchOnWindowFocus: false,
    enabled: true,
  })

  const items: Item[] = isLoading || error ? [] : data ?? []

  return (
    <Box height="calc(100vh - var(--nav-bar-height))" position="relative">
      <Box className={styles.floatingContainer}>
        <SidePanel items={items} isLoading={isLoading} error={!!error} />
      </Box>
      <Box height="100%">
        <Map />
      </Box>
    </Box>
  )
}
