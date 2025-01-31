import React from 'react'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { useQuery } from '@tanstack/react-query'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { fetchItems } from '@/services/ItemService'
import { Item } from '@/types'
import styles from './DataFinderPage.module.scss'

export const DataFinderPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['Items'],
    queryFn: fetchItems,
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
