import React, { useEffect } from 'react'

import { Flex, Box, Text, Grid, Select, Badge, Container } from '@radix-ui/themes'
import { QuickFilterMenu } from '@/components/QuickFilterMenu/QuickFilterMenu'
import { ActionsBar } from '@/components/ActionsBar/ActionsBar'
import { CollectionCard } from '@/components/CollectionCard/CollectionCard'
import type { Collection, QuickFilter } from '@/types'
import { FilterTags } from '@/components/FilterTags/FilterTags'
import styles from './DataDiscoveryPage.module.scss'
import { useSearchParams } from 'react-router-dom'
import { GROUP_BY_KEY, useCollections } from '@/hooks/useCollections'

interface GroupByCollection {
  category: { label: string; value: string }
  collections: Collection[]
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
  const {
    searchText,
    setSearchText,
    filters,
    setFilters,
    groupBy,
    setGroupBy,
    isLoading,
    error,
    errorMessages,
    filteredCollections,
    groupedByCollections,
  } = useCollections()

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    setFilters(Object.fromEntries(searchParams.entries()))
    const groupBy = (searchParams.get(GROUP_BY_KEY) ?? 'none') as keyof QuickFilter | 'none'
    setGroupBy(groupBy)
  }, [searchParams, setFilters, setGroupBy])

  const handleFilterChange = (value: string, key: keyof QuickFilter) => {
    const newParams = new URLSearchParams(searchParams)
    if (newParams.get(key) === value) {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }
    setSearchParams(newParams)
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleRemoveFilter = (key: keyof QuickFilter) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete(key)
    setSearchParams(newParams)
    setFilters((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleGroupBy = (value: keyof QuickFilter | 'none') => {
    const newParams = new URLSearchParams(searchParams)
    if (value === 'none') {
      newParams.delete(GROUP_BY_KEY)
    } else {
      newParams.set(GROUP_BY_KEY, value)
    }
    setSearchParams(newParams)
    setGroupBy(value)
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
    <Container align="center" maxWidth="1640px">
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
    </Container>
  )
}
