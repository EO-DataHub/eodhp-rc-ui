import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkspaceToken } from '@/hooks/useWorkspaceToken'
import { fetchItems, fetchUserItems } from '@/services/itemService'
import { Item } from '@/types'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useEffect } from 'react'
import { extractWorkspaceFromCollection } from '@/library/catalogUtils'

export const MAX_TOTAL_ITEMS = 100
export const MAX_USER_COLLECTION_ITEMS = 10000
export const PAGE_SIZE = 10

export const useItemsQuery = () => {
  const { currentWorkspace, token, userInfo, isAuthenticated } = useContext(AuthenticationContext)
  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const isUserCollection = useSelector(dataFinderStore, (state) => state.context.isUserCollection)
  const mapBounds = useSelector(dataFinderStore, (state) => state.context.mapBounds)
  const queryFilter = useSelector(dataFinderStore, (state) => state.context.queryFilter)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)
  const page = useSelector(dataFinderStore, (state) => state.context.page)

  // Determine if this is a job collection that needs authenticated fetching
  const isJobCollection = collection?.isJobCollection ?? false
  // Extract workspace from collection for job collections
  const collectionWorkspace = isJobCollection ? extractWorkspaceFromCollection(collection!) : null

  const queryKey = JSON.stringify({
    queryFilter,
    aoi: aoi?.geometry,
    mapBounds,
    collectionId: collection?.id,
    isUserCollection,
    isJobCollection,
    collectionWorkspace,
  })

  // Fetch workspace tokens for user collections (using currentWorkspace)
  const { data: workspaceTokensData } = useWorkspaceToken(
    currentWorkspace,
    token,
    userInfo?.sub,
    !!isUserCollection,
  )

  // Fetch workspace tokens for job collections (using collection's workspace)
  const { data: jobWorkspaceTokensData } = useWorkspaceToken(
    collectionWorkspace,
    token,
    userInfo?.sub,
    !!isJobCollection && isAuthenticated,
  )

  const fetchFunction = () => {
    // Job collections use authenticated fetching like user collections
    if (isJobCollection && collection && jobWorkspaceTokensData?.access) {
      return fetchUserItems(
        collection,
        jobWorkspaceTokensData.access,
        MAX_USER_COLLECTION_ITEMS,
        mapBounds,
        aoi,
      )
    }

    // User collections use authenticated fetching
    if (isUserCollection && collection && workspaceTokensData?.access) {
      return fetchUserItems(
        collection,
        workspaceTokensData.access,
        MAX_USER_COLLECTION_ITEMS,
        mapBounds,
        aoi,
      )
    }

    // Public collections use unauthenticated fetching
    return fetchItems({
      limit: MAX_TOTAL_ITEMS,
      mapBounds: mapBounds,
      aoi: aoi,
      selectedCollection: collection ?? undefined,
      queryFilter: queryFilter,
    })
  }

  const {
    data: allItems = [],
    isFetching,
    isFetched,
    error,
  } = useQuery<Item[]>({
    queryKey: ['Items', queryKey],
    queryFn: fetchFunction,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled:
      !!collection &&
      (!!queryFilter || !!aoi || !!mapBounds) &&
      // For job collections, wait for workspace tokens
      (!isJobCollection || !!jobWorkspaceTokensData) &&
      // For user collections, wait for workspace tokens
      (!isUserCollection || !!workspaceTokensData),
    placeholderData: (previousValue: Item[] | undefined): Item[] => previousValue ?? [],
  })

  const pageCount = Math.ceil(allItems.length / PAGE_SIZE)

  // Reset page after refetch
  useEffect(() => {
    if (isFetched) {
      dataFinderStore.send({ type: 'onFetched' })
    }
  }, [isFetched])

  return {
    allItems,
    error,
    hasPages: !error && pageCount > 1,
    isFetched,
    isFetching,
    page,
    pageCount: Math.ceil(allItems.length / PAGE_SIZE),
    pageItems: allItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
  }
}
