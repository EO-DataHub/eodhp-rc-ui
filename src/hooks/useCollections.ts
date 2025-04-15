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

  const { currentWorkspace, token, isAuthenticating } = useContext(AuthenticationContext)

  const { data: workspaceTokensData, isFetching: isTokenLoading } = useQuery({
    queryKey: ['WorkspaceTokens', currentWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!token,
  })

  const {
    data: userCollections,
    // we want to show the loading screen even when this query is pending / has no data
    // (i.e waiting for the token query to finish and be enabled)
    isPending: isUserCollectionPending,
    error: userCollectionError,
  } = useQuery({
    queryKey: ['UserCollections', currentWorkspace],
    queryFn: () => fetchUserCollections(currentWorkspace!, workspaceTokensData!.access),
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!workspaceTokensData,
  })

  const isLoading =
    queries.some((query) => query.isLoading) ||
    isAuthenticating ||
    (currentWorkspace && (isUserCollectionPending || isTokenLoading))

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
      const filterEntries = Object.entries(filters) as [keyof QuickFilter | 'groupBy', string][]

      // if user is filtering my data collection, make sure those collections be included
      // even if they don't have valid id in isValidCollectionId mapping
      if (
        !isValidCollectionId(collection.id) &&
        filterEntries.length === 1 &&
        filterEntries[0][1] === 'lic:my-data' &&
        !collection.isUserCollection
      ) {
        return false
      }

      for (const [filterKey, filterValue] of filterEntries) {
        if (filterKey === 'groupBy') continue
        if (!isValidCollectionId(collection.id)) {
          // this is to handle the case where new collection is added, but not in collectionCategorization
          // therefore, only filter those new collections out if the filterValue is not 'uncategorised'
          if (filterValue !== 'uncategorised') {
            return false
          }
        } else {
          const categorizationData = collectionCategorization[collection.id]

          if (
            filterKey in categorizationData &&
            filterValue !== undefined &&
            filterValue !== 'lic:my-data'
          ) {
            // also consider the collection to be uncategorised
            // if the categorizationData for the current filterKey is empty
            if (filterValue === 'uncategorised' && categorizationData[filterKey].length > 0) {
              return false
            }

            if (
              filterValue !== 'uncategorised' &&
              !(categorizationData[filterKey] as string[]).includes(filterValue)
            ) {
              return false
            }
          }

          // Filter user collection
          if (filterValue === 'lic:my-data' && !collection.isUserCollection) {
            return false
          }
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
            return category.value === 'uncategorised'
          }

          const categorizationData = collectionCategorization[collection.id]
          return (
            (categorizationData[groupBy][0] as string) === category.value ||
            (category.value === 'uncategorised' && categorizationData[groupBy].length === 0)
          )
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
    isLoading,
    error,
    errorMessages,
    sortedCollections,
    filteredCollections,
    groupedByCollections,
  }
}
