import React from 'react'
import { Flex, Text, Select, TextField, Button } from '@radix-ui/themes'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import type { TypeFilter } from '@/hooks/useProcessCatalogue'

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
          <TextField.Root
            placeholder="STAC collection ID"
            value={collectionFilter ?? ''}
            onChange={(e) => onCollectionFilterChange(e.target.value || null)}
            size="2"
            style={{ width: '200px' }}
          />
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
