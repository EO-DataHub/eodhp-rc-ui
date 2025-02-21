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
import { catalogs } from '@/constants'
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
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  // we verify that the collection in the url parameters is the same as the one in storage to use it
  useEffect(() => {
    const storedCollection = localStorage.getItem('selectedCollection')
    if (storedCollection) {
      const parsedCollection: Collection = JSON.parse(storedCollection)
      if (parsedCollection.id === collectionId) {
        setSelectedCollection(parsedCollection)
      }
    }
  }, [collectionId])

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
        localStorage.setItem('selectedCollection', JSON.stringify(foundCollection))
        setSelectedCollection(foundCollection)
      } else {
        navigate('/')
      }
    }
  }, [collectionId, navigate, selectedCollection, queries, shouldFetchCollections])

  const queryKey = JSON.stringify({ queryFilter, aoi: aoi?.geometry, mapBounds })
  const fetchFunction = () =>
    fetchItems({
      limit: MAX_TOTAL_ITEMS + 1, // Fetch one more than the max to see if there are more items
      mapBounds: mapBounds,
      aoi: aoi,
      selectedCollection: selectedCollection ?? undefined,
      queryFilter: queryFilter,
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
    placeholderData: (previousValue: Item[] | undefined): Item[] => previousValue ?? [],
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
          collection={selectedCollection ?? undefined}
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
