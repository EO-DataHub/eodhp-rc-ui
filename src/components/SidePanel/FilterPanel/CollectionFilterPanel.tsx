import React from 'react'
import { ReloadIcon, Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton } from '@radix-ui/themes'
import styles from './FilterPanel.module.scss'
import { QuickFilterMenu } from '@/components/QuickFilterMenu/QuickFilterMenu'
import { QuickFilter } from '@/types'

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
  // groupBy,
}) => {
  const handleFilterChange = (value: string, key: keyof QuickFilter) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }
  return (
    <Flex
      direction="column"
      p="4"
      className={`${styles.filterPanel} ${isOpen ? styles['filterPanel--open'] : ''}`}
    >
      <Flex direction="column" gap="6" height="100%">
        <Flex justify="between">
          <IconButton size="2" variant="ghost">
            <Flex gap="2" align="center">
              <ReloadIcon />
              <Text>Reset</Text>
            </Flex>
          </IconButton>
          <IconButton size="2" variant="ghost" onClick={onClose}>
            <Cross1Icon />
          </IconButton>
        </Flex>
        <QuickFilterMenu
          filters={filters}
          onFilterChange={handleFilterChange}
          flexDirection="column"
          inputSize="2"
        />
      </Flex>
    </Flex>
  )
}
