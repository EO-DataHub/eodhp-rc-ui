import React, { useMemo } from 'react'
import { Flex, Text, Select, TextField, Button } from '@radix-ui/themes'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import type { TypeFilter } from '@/hooks/useProcessCatalogue'
import { useCollections } from '@/hooks/useCollections'

export interface ProcessFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  typeFilter: TypeFilter
  onTypeFilterChange: (value: TypeFilter) => void
  collectionFilter: string | null
  onCollectionFilterChange: (value: string | null) => void
  hasActiveFilters?: boolean
  onClearAll?: () => void
}

export const ProcessFilters: React.FC<ProcessFiltersProps> = ({
  searchValue,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  collectionFilter,
  onCollectionFilterChange,
  hasActiveFilters = false,
  onClearAll,
}) => {
  const { sortedCollections, isLoading: isCollectionsLoading } = useCollections()

  const collectionOptions = useMemo(() => {
    const seen = new Set<string>()

    return sortedCollections.reduce<{ value: string; label: string }[]>((acc, collection) => {
      const value = collection.id

      if (!value || seen.has(value)) {
        return acc
      }

      seen.add(value)

      const baseTitle = collection.displayedTitle ?? collection.title ?? collection.id
      const label =
        collection.title && collection.title !== collection.id
          ? `${baseTitle} (${collection.id})`
          : baseTitle

      acc.push({ value, label })
      return acc
    }, [])
  }, [sortedCollections])

  const hasCollectionOptions = collectionOptions.length > 0
  const isCollectionSelectDisabled = isCollectionsLoading || !hasCollectionOptions
  const collectionPlaceholder = isCollectionsLoading
    ? 'Loading collections…'
    : hasCollectionOptions
      ? 'All collections'
      : 'Collections unavailable'

  return (
    <Flex direction="column" gap="3" width="100%">
      <Flex align="center" justify="end">
        <TextField.Root
          placeholder="Search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          size="3"
          style={{ width: '100%', maxWidth: '320px' }}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
      </Flex>

      <Flex gap="4" wrap="wrap" align="center">
        <Flex align="center" gap="2">
          <Text weight="bold" size="2">
            Type
          </Text>
          <Select.Root
            value={typeFilter}
            onValueChange={(v) => onTypeFilterChange(v as TypeFilter)}
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
          <Select.Root
            value={collectionFilter ?? 'all'}
            onValueChange={(v) => onCollectionFilterChange(v === 'all' ? null : v)}
            disabled={isCollectionSelectDisabled}
          >
            <Select.Trigger placeholder={collectionPlaceholder} style={{ width: '200px' }} />
            <Select.Content position="popper">
              <Select.Item value="all">All</Select.Item>
              {collectionOptions.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>

        {hasActiveFilters && onClearAll ? (
          <Button variant="soft" size="1" onClick={onClearAll}>
            Clear all filters
          </Button>
        ) : null}
      </Flex>
    </Flex>
  )
}
