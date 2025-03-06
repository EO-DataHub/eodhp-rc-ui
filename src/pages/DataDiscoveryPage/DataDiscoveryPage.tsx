import React, { useMemo, useState } from 'react'

import { Flex, Box, Text, Grid, Select, Badge } from '@radix-ui/themes'
import { useQueries } from '@tanstack/react-query'
import { fetchCollections } from '@/services/collectionService'
import { QuickFilterMenu } from '@/components/QuickFilterMenu/QuickFilterMenu'
import { ActionsBar } from '@/components/ActionsBar/ActionsBar'
import { CollectionCard } from '@/components/CollectionCard/CollectionCard'
import type { Collection, QuickFilter } from '@/types'
import { catalogs } from '@/constants/catalogs'
import { collectionCategorization, filterMapping } from '@/constants/collectionCategorizations'
import { FilterTags } from '@/components/FilterTags/FilterTags'
import styles from './DataDiscoveryPage.module.scss'
import { useSearchParams } from 'react-router-dom'
import { flexibleSearch } from '@/library/stringUtils'

interface GroupByCollection {
  category: { label: string; value: string }
  collections: Collection[]
}

const isValidCollectionId = (id: string): id is keyof typeof collectionCategorization => {
  return id in collectionCategorization
}

const GROUP_BY_KEY = 'groupBy'

const isCollectionMatchingSearch = (collection: Collection, searchText: string) => {
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

const renderCollections = (collections: Collection[]) => {
  if (!collections) {
    return null
  }

  return (
    <Grid
      p="5"
      gap="5"
      columns={{ lg: '4', md: '3', sm: '2' }}
      width="auto"
      className={styles.collectionGrid}
    >
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </Grid>
  )
}

const renderGroupedByCollections = (groupedByCollections: GroupByCollection[]) => {
  if (!groupedByCollections) {
    return null
  }

  return (
    <Flex direction="column" gap="5" p="5" className={styles.collectionGrid}>
      {groupedByCollections.map(
        (group) =>
          group.collections.length > 0 && (
            <Flex gap="2" direction="column" key={group.category.value}>
              <Flex gap="2" align="center">
                <Text size="5" weight="bold">
                  {group.category.label}
                </Text>
                <Badge
                  radius="full"
                  highContrast
                  variant="solid"
                  className={styles.collectionCount}
                  style={{
                    width: 24,
                    height: 24,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {group.collections.length}
                </Badge>
              </Flex>

              <Grid gap="5" columns={{ lg: '4', md: '3' }}>
                {group.collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </Grid>
            </Flex>
          ),
      )}
    </Flex>
  )
}

export const DataDiscoveryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = Object.fromEntries(searchParams.entries())
  const groupBy = (searchParams.get(GROUP_BY_KEY) ?? 'none') as keyof QuickFilter | 'none'
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

  const handleFilterChange = (value: string, key: keyof QuickFilter) => {
    const newParams = new URLSearchParams(searchParams)
    if (newParams.get(key) === value) {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }
    setSearchParams(newParams)
  }

  const handleRemoveFilter = (key: keyof QuickFilter) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete(key)
    setSearchParams(newParams)
  }

  const handleGroupBy = (value: keyof QuickFilter | 'none') => {
    const newParams = new URLSearchParams(searchParams)
    if (value === 'none') {
      newParams.delete(GROUP_BY_KEY)
    } else {
      newParams.set(GROUP_BY_KEY, value)
    }
    setSearchParams(newParams)
  }

  if (isLoading) {
    return (
      <Flex justify="center" align="center">
        <Text>Loading Collections...</Text>
      </Flex>
    )
  }

  if (error) {
    return (
      <Flex justify="center" align="center">
        {errorMessages.map((errorMessage, index) => (
          <Text key={index} color="red">
            Error loading Collection: {errorMessage}
          </Text>
        ))}
      </Flex>
    )
  }

  return (
    <Flex direction="column" height="100vh" maxWidth="1640px" width="100%" mx="auto">
      <Box flexGrow="1">
        <QuickFilterMenu filters={filters} onFilterChange={handleFilterChange} />
        <ActionsBar searchText={searchText} onSearch={setSearchText} />
        <FilterTags filters={filters} onRemoveFilter={handleRemoveFilter} />

        <Flex px="5" flexGrow="1" direction="column" gap="1">
          <Text weight="bold" size="2">
            Group By
          </Text>
          <Select.Root size="3" defaultValue="none" value={groupBy} onValueChange={handleGroupBy}>
            <Select.Trigger style={{ width: '290px' }} placeholder="Group By" />
            <Select.Content position="popper">
              <Select.Group>
                <Select.Item value="none">None</Select.Item>
                <Select.Item value="dataCategory">Data Category</Select.Item>
                <Select.Item value="resolution">Resolution</Select.Item>
                <Select.Item value="provider">Provider</Select.Item>
                <Select.Item value="location">Location</Select.Item>
                <Select.Item value="keyword">Keywords</Select.Item>
                <Select.Item value="license">License</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>
        {filteredCollections.length === 0 ? (
          <Box p="5">
            <Text>No matching collections, please refine your search.</Text>
          </Box>
        ) : groupBy === 'none' ? (
          renderCollections(filteredCollections)
        ) : (
          renderGroupedByCollections(groupedByCollections)
        )}
      </Box>
    </Flex>
  )
}
