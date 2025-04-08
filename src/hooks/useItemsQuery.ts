import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchItems, fetchUserItems } from '@/services/itemService'
import { Item } from '@/types'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useEffect } from 'react'

export const MAX_TOTAL_ITEMS = 100
export const PAGE_SIZE = 10

const useItemsQuery = () => {
  const { workspaceUserName, token } = useContext(AuthenticationContext)
  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const isUserCollection = useSelector(dataFinderStore, (state) => state.context.isUserCollection)
  const mapBounds = useSelector(dataFinderStore, (state) => state.context.mapBounds)
  const queryFilter = useSelector(dataFinderStore, (state) => state.context.queryFilter)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)
  const page = useSelector(dataFinderStore, (state) => state.context.page)

  const queryKey = JSON.stringify({
    queryFilter,
    aoi: aoi?.geometry,
    mapBounds,
    collectionId: collection?.id,
    isUserCollection,
  })

  const { data: workspaceTokensData } = useQuery({
    queryKey: ['WorkspaceTokens', workspaceUserName, token],
    queryFn: () => fetchWorkspaceTokens(workspaceUserName!, token!),
    refetchOnWindowFocus: false,
    enabled: !!workspaceUserName && !!token,
  })

  const fetchFunction = () => {
    return isUserCollection && collection
      ? fetchUserItems(collection, workspaceTokensData!.access)
      : fetchItems({
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
    enabled: !!collection && (!!queryFilter || !!aoi || !!mapBounds),
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

export default useItemsQuery
