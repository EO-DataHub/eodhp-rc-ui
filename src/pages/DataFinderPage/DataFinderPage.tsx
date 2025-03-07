import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { useQuery } from '@tanstack/react-query'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { useQueries } from '@tanstack/react-query'
import { fetchCollections } from '@/services/collectionService'
import { fetchItems } from '@/services/ItemService'
import { Collection, Item } from '@/types'
import { catalogs } from '@/constants/catalogs'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from './useFinderStore'

import styles from './DataFinderPage.module.scss'

export const MAX_TOTAL_ITEMS = 100
export const PAGE_SIZE = 10

export const DataFinderPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const page = useSelector(dataFinderStore, (state) => state.context.page)
  const mapBounds = useSelector(dataFinderStore, (state) => state.context.mapBounds)
  const queryFilter = useSelector(dataFinderStore, (state) => state.context.queryFilter)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  // This is a replacement for the isLoading flag from useQuery. Due to the usage of placeholder data
  // in the useQuery hook, we need to keep track of the loading outside of it, because isLoading will
  // be false after the first render.
  const isLoading = useSelector(dataFinderStore, (state) => state.context.isLoading)

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  const shouldFetchCollections =
    selectedCollection === null || selectedCollection.id !== collectionId

  const queries = useQueries({
    queries: shouldFetchCollections
      ? catalogs.map((catalog, index) => ({
          queryKey: ['Collections', index],
          queryFn: () => fetchCollections(catalog),
        }))
      : [],
  })

  // If collectionId is not part of any valid collection, we return to the DataDiscoveryPage.
  // Otherwise, we store the collection and use it.
  useEffect(() => {
    if (shouldFetchCollections && queries.length > 0 && queries.every((q) => q.isFetched)) {
      const allCollections: Collection[] = queries.flatMap((query) => query.data ?? [])
      const foundCollection = allCollections.find((col) => col.id === collectionId)

      if (foundCollection) {
        setSelectedCollection(foundCollection)
        dataFinderStore.send({ type: 'setCollection', collection: foundCollection })
      } else {
        navigate('/')
      }
    }
  }, [collectionId, navigate, selectedCollection, queries, shouldFetchCollections])

  const queryKey = JSON.stringify({ queryFilter, aoi: aoi?.geometry, mapBounds })
  const fetchFunction = () =>
    fetchItems({
      limit: MAX_TOTAL_ITEMS,
      mapBounds: mapBounds,
      aoi: aoi,
      selectedCollection: selectedCollection ?? undefined,
      queryFilter: queryFilter,
    })

  const {
    data: itemList = [],
    isFetching,
    isFetched,
    error,
  } = useQuery<Item[]>({
    queryKey: ['Items', queryKey],
    queryFn: fetchFunction,
    refetchOnWindowFocus: false,
    enabled: !!queryFilter || !!aoi || !!mapBounds,
    placeholderData: (previousValue: Item[] | undefined): Item[] => previousValue ?? [],
  })

  // Reset page after refetch
  useEffect(() => {
    if (isFetched) {
      dataFinderStore.send({ type: 'onFetched' })
    }
  }, [isFetched])

  // Slice the visible items based on the current page
  const paginatedItems = itemList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <Box height="var(--content-height)" position="relative">
      <Box className={styles.floatingContainer}>
        <SidePanel
          items={itemList}
          collection={selectedCollection ?? undefined}
          isLoading={isLoading}
          isFetching={isFetching}
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
