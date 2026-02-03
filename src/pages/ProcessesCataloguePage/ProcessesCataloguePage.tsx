import React, { useEffect } from 'react'
import {
  Flex,
  Box,
  Text,
  Grid,
  Select,
  Container,
  Separator,
  TextField,
  Button,
} from '@radix-ui/themes'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { ProcessCard } from '@/components/ProcessCard/ProcessCard'
import { useProcessCatalogue } from '@/hooks/useProcessCatalogue'
import styles from './ProcessesCataloguePage.module.scss'

export const ProcessesCataloguePage: React.FC = () => {
  const {
    items,
    totalItems,
    page,
    totalPages,
    searchInput,
    typeFilter,
    collectionFilter,
    isLoading,
    error,
    setSearchQuery,
    setTypeFilter,
    setCollectionFilter,
    setPage,
    clearAllFilters,
    retry,
    searchQuery,
  } = useProcessCatalogue()

  useEffect(() => {
    document.title = 'Processes Catalogue'
    return () => {
      document.title = 'EODH Resource Catalog'
    }
  }, [])

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || collectionFilter

  if (isLoading && items.length === 0) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
        <Text>Loading processes…</Text>
      </Flex>
    )
  }

  if (error && items.length === 0) {
    return (
      <Container align="center" maxWidth="1640px">
        <Flex direction="column" gap="4" p="6" align="center">
          <Text color="red">{error}</Text>
          <Button onClick={retry}>Retry</Button>
        </Flex>
      </Container>
    )
  }

  return (
    <Container align="center" maxWidth="1640px">
      <Flex p="5" align="center" justify="between" width="100%">
        <Text size="7" weight="medium">
          Processes Catalogue
        </Text>
        <TextField.Root
          placeholder="Search"
          value={searchInput}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="3"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
      </Flex>
      <Separator style={{ width: '100%' }} />
      <Flex px="5" py="3" gap="4" wrap="wrap" align="center">
        <Flex align="center" gap="2">
          <Text weight="bold" size="2">
            Type
          </Text>
          <Select.Root
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as 'all' | 'workflow' | 'notebook')}
          >
            <Select.Trigger style={{ width: '140px' }} />
            <Select.Content position="popper">
              <Select.Item value="all">All</Select.Item>
              <Select.Item value="workflow">Workflow</Select.Item>
              <Select.Item value="notebook">Notebook</Select.Item>
            </Select.Content>
          </Select.Root>
        </Flex>
        <Flex align="center" gap="2">
          <Text weight="bold" size="2">
            Collection
          </Text>
          <TextField.Root
            placeholder="STAC collection ID"
            value={collectionFilter ?? ''}
            onChange={(e) => setCollectionFilter(e.target.value || null)}
            size="2"
            style={{ width: '200px' }}
          />
        </Flex>
        {hasActiveFilters ? (
          <Button variant="soft" size="1" onClick={clearAllFilters}>
            Clear all filters
          </Button>
        ) : null}
      </Flex>
      {items.length === 0 ? (
        <Box p="5">
          <Text>No workflows or notebooks found. Try adjusting your filters or search.</Text>
        </Box>
      ) : (
        <>
          <Grid
            p="5"
            gap="5"
            columns={{ lg: '4', md: '3', sm: '2' }}
            width="auto"
            className={styles.collectionGrid}
          >
            {items.map((record) => (
              <ProcessCard key={record.id} record={record} />
            ))}
          </Grid>
          {totalPages > 1 ? (
            <Flex justify="center" gap="2" p="4">
              <Button
                variant="soft"
                size="1"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Text size="2" as="span" style={{ alignSelf: 'center' }}>
                Page {page} of {totalPages} ({totalItems} items)
              </Text>
              <Button
                variant="soft"
                size="1"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </Flex>
          ) : null}
        </>
      )}
    </Container>
  )
}
