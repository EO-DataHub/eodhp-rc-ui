import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchCollections, fetchUserCollections } from '@/services/collectionService'
import type { Collection, QuickFilter } from '@/types'
import { catalogs } from '@/constants/catalogs'
import {
  collectionCategorization,
  filterMapping,
  isValidCollectionId,
} from '@/constants/collectionCategorizations'
import { useContext, useMemo, useState } from 'react'
import { isCollectionMatchingSearch } from '@/library/collectionUtils'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'

export const GROUP_BY_KEY = 'groupBy'

export const useCollections = () => {
  const [filters, setFilters] = useState<QuickFilter>({})
  const [groupBy, setGroupBy] = useState<keyof QuickFilter | 'none'>('none')
  const [searchText, setSearchText] = useState('')

  const queries = useQueries({
    queries: catalogs.map((catalog, index) => ({
      queryKey: ['Collections', index],
      queryFn: () => fetchCollections(catalog),
    })),
  })

  const { workspaceUserName, token, isAuthenticating } = useContext(AuthenticationContext)

  const { data: workspaceTokensData, isFetching: isTokenLoading } = useQuery({
    queryKey: ['WorkspaceTokens', workspaceUserName, token],
    queryFn: () => fetchWorkspaceTokens(workspaceUserName!, token!),
    refetchOnWindowFocus: false,
    enabled: !!workspaceUserName && !!token,
  })

  const {
    data: userCollections,
    // we want to show the loading screen even when this query is pending / has no data
    // (i.e waiting for the token query to finish and be enabled)
    isPending: isUserCollectionPending,
    error: userCollectionError,
  } = useQuery({
    queryKey: ['UserCollections', workspaceUserName],
    queryFn: () => fetchUserCollections(workspaceUserName!, workspaceTokensData!.access),
    refetchOnWindowFocus: false,
    enabled: !!workspaceUserName && !!workspaceTokensData,
  })

  const isLoading =
    queries.some((query) => query.isLoading) ||
    isAuthenticating ||
    (workspaceUserName && (isUserCollectionPending || isTokenLoading))

  const error = queries.some((query) => query.isError) || userCollectionError
  const errorMessages = queries.map((query) => query.error?.message).filter(Boolean)
  const collectionCount =
    queries.reduce((total, query) => total + (query.data?.length ?? 0), 0) + useCollections.length

  const sortedCollections = useMemo(() => {
    const mergedCollections: Collection[] = queries
      .flatMap((query) => query.data ?? [])
      .map((collection) => ({
        ...collection,
        displayedTitle: collection.title,
      }))

    const updatedUserCollections = userCollections?.map((collection) => ({
      ...collection,
      displayedTitle: `My ${collection.title}`,
      isUserCollection: true,
    }))

    // sort and filter base on search text
    return [...mergedCollections, ...(updatedUserCollections ?? [])]
      .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
      .filter((collection) => {
        return isCollectionMatchingSearch(collection, searchText)
      })
  }, [queries, searchText, userCollections])

  const filteredCollections = useMemo(() => {
    // no filter applied
    if (Object.keys(filters).length === 0) {
      return sortedCollections
    }

    return sortedCollections.filter((collection) => {
      const entries = Object.entries(filters) as [keyof QuickFilter, string][]

      if (!isValidCollectionId(collection.id)) {
        return (
          // check if user is filtering my-data
          entries.length === 1 && entries[0][1] === 'lic:my-data' && collection.isUserCollection
        )
      }

      const categorizationData = collectionCategorization[collection.id]

      // one collection must satisfy all selected filter options to be included
      for (const [filterKey, filterValue] of entries) {
        if (
          filterKey in categorizationData &&
          filterValue !== undefined &&
          filterValue !== 'lic:my-data' &&
          !(categorizationData[filterKey] as string[]).includes(filterValue)
        ) {
          return false
        }

        // Filter user collection
        if (filterValue === 'lic:my-data' && !collection.isUserCollection) {
          return false
        }
      }

      return true
    })
  }, [filters, sortedCollections])

  const groupedByCollections = useMemo(() => {
    if (groupBy === 'none') {
      return []
    }

    const categories = filterMapping[groupBy]

    return categories.map((category) => {
      return {
        category,
        collections: filteredCollections.filter((collection) => {
          if (!isValidCollectionId(collection.id)) {
            return false
          }

          const categorizationData = collectionCategorization[collection.id]
          return (categorizationData[groupBy][0] as string) === category.value
        }),
      }
    })
  }, [filteredCollections, groupBy])

  return {
    collectionCount,
    searchText,
    setSearchText,
    filters,
    setFilters,
    groupBy,
    setGroupBy,
    isLoading: isLoading,
    error,
    errorMessages,
    sortedCollections,
    filteredCollections,
    groupedByCollections,
  }
}
