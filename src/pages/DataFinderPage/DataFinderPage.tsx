import React from 'react'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { useQuery } from '@tanstack/react-query'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { fetchItems } from '@/services/ItemService'
import { Item } from '@/types'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from './useFinderStore'

import styles from './DataFinderPage.module.scss'

export const MAX_TOTAL_ITEMS = 100
export const PAGE_SIZE = 10

export const DataFinderPage: React.FC = () => {
  const mapBounds = useSelector(dataFinderStore, (state) => state.context.mapBounds)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  // Determine the query key based on AOI geometry or map bounds
  const queryKey = aoi?.geometry ? JSON.stringify(aoi.geometry) : mapBounds?.toString()

  const {
    data: itemList = [],
    isLoading,
    error,
  } = useQuery<Item[]>({
    queryKey: ['Items', queryKey],
    queryFn: () => fetchItems({ limit: MAX_TOTAL_ITEMS + 1, mapBounds, aoi }), // Fetch one more than the max to see if there are more items
    refetchOnWindowFocus: false,
    enabled: !!aoi || !!mapBounds,
    placeholderData: (previousValue) => previousValue,
  })

  return (
    <Box height="var(--content-height)" position="relative">
      <Box className={styles.floatingContainer}>
        <SidePanel items={itemList} isLoading={isLoading} error={!!error} />
      </Box>
      <Box height="100%">
        <Map itemList={itemList} />
      </Box>
    </Box>
  )
}
