import React from 'react'
import { ReloadIcon, Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton, Heading, Select } from '@radix-ui/themes'
import styles from './FilterPanel.module.scss'
import { QuickFilterMenu } from '@/components/QuickFilterMenu/QuickFilterMenu'
import { QuickFilter } from '@/types'
import { FilterTags } from '@/components/FilterTags/FilterTags'

interface CollectionFilterPanelProps {
  isOpen: boolean
  onClose: () => void
  filters: QuickFilter
  setFilters: React.Dispatch<React.SetStateAction<QuickFilter>>
  groupBy: keyof QuickFilter | 'none'
  setGroupBy: React.Dispatch<React.SetStateAction<keyof QuickFilter | 'none'>>
}

export const CollectionFilterPanel: React.FC<CollectionFilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  groupBy,
  setGroupBy,
}) => {
  const handleFilterChange = (value: string, key: keyof QuickFilter) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleGroupBy = (value: keyof QuickFilter | 'none') => {
    setGroupBy(value)
  }

  const handleReset = () => {
    setGroupBy('none')
    setFilters({})
  }

  const handleRemoveFilter = (key: keyof QuickFilter) => {
    setFilters((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Flex
      direction="column"
      p="4"
      className={`${styles.filterPanel} ${isOpen ? styles['filterPanel--open'] : ''}`}
    >
      <Flex direction="column" gap="5" height="100%">
        <Flex justify="between" align="center">
          <IconButton size="2" variant="ghost" onClick={handleReset}>
            <Flex gap="2" align="center">
              <ReloadIcon />
              <Text>Reset</Text>
            </Flex>
          </IconButton>
          <IconButton size="2" variant="ghost" onClick={onClose}>
            <Cross1Icon />
          </IconButton>
        </Flex>
        <FilterTags filters={filters} onRemoveFilter={handleRemoveFilter} variant="compact" />
        <Flex direction="column" gap="2">
          <Heading size="2" as="h4">
            Filters
          </Heading>
          <QuickFilterMenu
            filters={filters}
            onFilterChange={handleFilterChange}
            flexDirection="column"
            inputSize="2"
            onClearAll={handleReset}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Heading size="2" as="h4">
            Group By
          </Heading>
          <Select.Root size="2" defaultValue="none" value={groupBy} onValueChange={handleGroupBy}>
            <Select.Trigger style={{ width: '100%' }} placeholder="Group By" />
            <Select.Content position="popper">
              <Select.Group>
                <Select.Item value="none">None</Select.Item>
                <Select.Item value="dataCategory">Data Category</Select.Item>
                <Select.Item value="resolution">Resolution</Select.Item>
                <Select.Item value="provider">Provider</Select.Item>
                <Select.Item value="location">Location</Select.Item>
                <Select.Item value="license">License</Select.Item>
                <Select.Item value="qa">Quality Assessment</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>
    </Flex>
  )
}
