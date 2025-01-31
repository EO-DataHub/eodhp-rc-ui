import React, { useState } from 'react'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { useQuery } from '@tanstack/react-query'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { fetchItems } from '@/services/ItemService'
import { Item } from '@/types'
import styles from './DataFinderPage.module.scss'

const ITEMS_PER_PAGE = 10

export const DataFinderPage: React.FC = () => {
  const [page, setPage] = useState(0) // use 0-based index

  const { data, isLoading, error } = useQuery({
    queryKey: ['Items', page],
    queryFn: () => fetchItems({ page, limit: ITEMS_PER_PAGE }),
    refetchOnWindowFocus: false,
    enabled: true,
  })

  const items: Item[] = isLoading || error ? [] : data ?? []

  return (
    <Box height="calc(100vh - var(--nav-bar-height))" position="relative">
      <Box className={styles.floatingContainer}>
        <SidePanel
          items={items}
          isLoading={isLoading}
          error={!!error}
          page={page}
          setPage={setPage}
        />
      </Box>
      <Box height="100%">
        <Map />
      </Box>
    </Box>
  )
}
