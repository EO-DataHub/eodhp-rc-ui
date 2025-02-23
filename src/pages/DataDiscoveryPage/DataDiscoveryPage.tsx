import React, { useMemo, useState } from 'react'

import { Flex, Box, Text, Grid, Select } from '@radix-ui/themes'
import { Footer } from '@/components/Footer/Footer'
import { useQueries } from '@tanstack/react-query'
import { fetchCollections } from '@/services/collectionService'
import { QuickFilterMenu } from '@/components/QuickFilterMenu/QuickFilterMenu'
import { ActionsBar } from '@/components/ActionsBar/ActionsBar'
import { CollectionCard } from '@/components/CollectionCard/CollectionCard'
import type { Collection, QuickFilter } from '@/types'
import { catalogs } from '@/constants'
import { collectionCategorization } from '@/components/QuickFilterMenu/filterConstants'

export const DataDiscoveryPage: React.FC = () => {
  const [filters, setFilters] = useState<QuickFilter>({})

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
    return [...mergedCollections].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
  }, [queries])

  const filteredCollections = useMemo(() => {
    // no filter applied
    if (Object.keys(filters).length === 0) {
      return sortedCollections
    }

    return sortedCollections.filter((collection) => {
      if (!(collection.id in collectionCategorization)) {
        return false
      }

      const collectionId = collection.id as keyof typeof collectionCategorization
      const categorizationData = collectionCategorization[collectionId]
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
    <Flex direction="column" height="100vh">
      <Box flexGrow="1">
        <QuickFilterMenu filters={filters} setFilters={setFilters} />
        <ActionsBar />
        <Box p="5" flexGrow="1">
          <Select.Root size="3">
            <Select.Trigger style={{ width: '290px' }} placeholder="Group By" />
            <Select.Content style={{ marginTop: '45px' }}>
              <Select.Group>
                <Select.Item value="data_category">Data Category</Select.Item>
                <Select.Item value="resolution">Resolution</Select.Item>
                <Select.Item value="provider">Provider</Select.Item>
                <Select.Item value="location">Location</Select.Item>
                <Select.Item value="keywords">Keywords</Select.Item>
                <Select.Item value="time_period">Time Period</Select.Item>
                <Select.Item value="license">License</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Box>
        <Grid p="5" gap="3" columns="4" rows="4" width="auto">
          {filteredCollections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </Grid>
      </Box>
      <Footer />
    </Flex>
  )
}
