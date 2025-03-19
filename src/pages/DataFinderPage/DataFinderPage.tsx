import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { useQuery } from '@tanstack/react-query'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { useQueries } from '@tanstack/react-query'
import { fetchCollections } from '@/services/collectionService'
import { fetchItems } from '@/services/ItemService'
import { Item } from '@/types'
import { catalogs } from '@/constants/catalogs'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from './useFinderStore'

import styles from './DataFinderPage.module.scss'

export const MAX_TOTAL_ITEMS = 100
export const PAGE_SIZE = 10

export const DataFinderPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const page = useSelector(dataFinderStore, (state) => state.context.page)
  const mapBounds = useSelector(dataFinderStore, (state) => state.context.mapBounds)
  const queryFilter = useSelector(dataFinderStore, (state) => state.context.queryFilter)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  // This is a replacement for the isLoading flag from useQuery. Due to the usage of placeholder data
  // in the useQuery hook, we need to keep track of the loading outside of it, because isLoading will
  // be false after the first render.
  const isLoading = useSelector(dataFinderStore, (state) => state.context.isLoading)

  const queries = useQueries({
    queries: catalogs.map((catalog) => ({
      queryKey: ['Collections', catalog],
      queryFn: () => fetchCollections(catalog),
    })),
    combine: (results) => ({
      isFetched: results.every((result) => result.isFetched),
      data: results.flatMap((result) => result.data ?? []),
    }),
  })

  useEffect(() => {
    if (queries.isFetched) {
      const allCollections = queries.data
      const foundCollection = allCollections.find((col) => col.id === collectionId)

      if (foundCollection) {
        dataFinderStore.send({ type: 'setCollection', collection: foundCollection })
      } else {
        navigate('/')
      }
    }
  }, [collectionId, navigate, collection, queries])

  const queryKey = JSON.stringify({
    queryFilter,
    aoi: aoi?.geometry,
    mapBounds,
    collectionId: collection?.id,
  })
  const fetchFunction = () =>
    fetchItems({
      limit: MAX_TOTAL_ITEMS,
      mapBounds: mapBounds,
      aoi: aoi,
      selectedCollection: collection ?? undefined,
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
          collection={collection ?? undefined}
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
