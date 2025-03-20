import { useQueries } from '@tanstack/react-query'
import { fetchCollections } from '@/services/collectionService'
import type { Collection, QuickFilter } from '@/types'
import { catalogs } from '@/constants/catalogs'
import {
  collectionCategorization,
  filterMapping,
  isValidCollectionId,
} from '@/constants/collectionCategorizations'
import { useMemo, useState } from 'react'
import { flexibleSearch } from '@/library/stringUtils'

export const isCollectionMatchingSearch = (collection: Collection, searchText: string) => {
  const searchFields: (keyof Collection)[] = ['id', 'title', 'description', 'keywords', 'providers']

  for (const field of searchFields) {
    if (field in collection) {
      const value = collection[field]

      if (typeof value === 'string' && flexibleSearch(value, searchText) !== -1) {
        return true
      }

      if (
        Array.isArray(value) &&
        value.some((item) => {
          if (typeof item === 'string') {
            return flexibleSearch(item, searchText) !== -1
          }
          if (typeof item === 'object' && 'name' in item) {
            return flexibleSearch(item.name, searchText) !== -1
          }
          return false
        })
      ) {
        return true
      }
    }
  }

  return false // No match found
}

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

  const isLoading = queries.some((query) => query.isLoading)
  const error = queries.some((query) => query.isError)
  const errorMessages = queries.map((query) => query.error?.message).filter(Boolean)
  const collectionCount = queries.reduce((total, query) => total + (query.data?.length ?? 0), 0)

  const sortedCollections = useMemo(() => {
    const mergedCollections: Collection[] = queries.flatMap((query) => query.data ?? [])

    // sort and filter base on search text
    return [...mergedCollections]
      .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
      .filter((collection) => {
        return isCollectionMatchingSearch(collection, searchText)
      })
  }, [queries, searchText])

  const filteredCollections = useMemo(() => {
    // no filter applied
    if (Object.keys(filters).length === 0) {
      return sortedCollections
    }

    return sortedCollections.filter((collection) => {
      if (!isValidCollectionId(collection.id)) {
        return false
      }

      const categorizationData = collectionCategorization[collection.id]
      const entries = Object.entries(filters) as [keyof QuickFilter, string][]

      // one collection must satisfy all selected filter options to be included
      for (const [filterKey, filterValue] of entries) {
        if (
          filterKey in categorizationData &&
          filterValue !== undefined &&
          !(categorizationData[filterKey] as string[]).includes(filterValue)
        ) {
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
    isLoading,
    error,
    errorMessages,
    sortedCollections,
    filteredCollections,
    groupedByCollections,
  }
}
