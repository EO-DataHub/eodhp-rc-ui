import React, { useEffect } from 'react'

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
  const page = useSelector(dataFinderStore, (state) => state.context.page)
  const mapBounds = useSelector(dataFinderStore, (state) => state.context.mapBounds)
  const queryFilter = useSelector(dataFinderStore, (state) => state.context.queryFilter)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)
  const storedCollection = localStorage.getItem('selectedCollection')
  const selectedCollection = storedCollection ? JSON.parse(storedCollection) : null

  const queryKey = JSON.stringify({ queryFilter, aoi: aoi?.geometry, mapBounds })
  const fetchFunction = () =>
    fetchItems({
      limit: MAX_TOTAL_ITEMS + 1, // Fetch one more than the max to see if there are more items
      mapBounds,
      aoi,
      queryFilter,
      selectedCollection,
    })

  const {
    data: itemList = [],
    isLoading,
    isFetching,
    isFetched,
    error,
  } = useQuery<Item[]>({
    queryKey: ['Items', queryKey],
    queryFn: fetchFunction,
    refetchOnWindowFocus: false,
    enabled: !!queryFilter || !!aoi || !!mapBounds,
    placeholderData: (previousValue) => previousValue,
  })

  // Reset page after refetch
  useEffect(() => {
    if (isFetched) {
      dataFinderStore.send({ type: 'pageChange', page: 0 })
    }
  }, [isFetched])

  // Slice the visible items based on the current page
  const paginatedItems = itemList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <Box height="var(--content-height)" position="relative">
      <Box className={styles.floatingContainer}>
        <SidePanel
          items={itemList}
          collection={selectedCollection}
          isLoading={isLoading || isFetching}
          error={!!error}
          page={page}
          setPage={(page) => dataFinderStore.send({ type: 'pageChange', page })}
        />
      </Box>
      <Box height="100%">
        <Map visibleItems={paginatedItems} />
      </Box>
    </Box>
  )
}
