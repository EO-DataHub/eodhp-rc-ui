import React, { useState } from 'react'
import { Flex, IconButton, Text } from '@radix-ui/themes'
import { FilterPanel } from './FilterPanel/FilterPanel'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import { ItemCard } from '@/components/ItemCard/ItemCard'
import { Item } from '@/types'
import FilterAltFilled from '../../../public/filter-alt-filled.svg?react'
import styles from './SidePanel.module.scss'
import { PageSelector } from '../Pagination/PageSelector/PageSelector'

interface SidePanelProps {
  items: Item[]
  isLoading: boolean
  error: boolean
  page: number
  setPage: (page: number) => void
}

const PaginationContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex justify="center" className={styles.paginationContainer}>
      {children}
    </Flex>
  )
}

const ItemList = ({
  items,
  isLoading,
  error,
}: {
  items: Item[]
  isLoading: boolean
  error: boolean
}) => {
  if (isLoading) {
    return <Text>Loading Items...</Text>
  }

  if (error) {
    return <Text color="red">Error loading items!</Text>
  }

  return (
    <div className={styles.listContainer}>
      <ul>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </ul>
    </div>
  )
}
export const SidePanel: React.FC<SidePanelProps> = ({ items, isLoading, error, page, setPage }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev)
  }

  return (
    <Flex height={'calc(100vh - var(--nav-bar-height))'} position="relative">
      <Flex className={styles.sidePanel} direction="column" width="338px" p="4" gap="2">
        <Flex justify="end">
          <IconButton size="2" variant="ghost" onClick={toggleFilterPanel}>
            <Flex gap="2" align="center">
              <Text>Filters</Text>
              <FilterAltFilled />
            </Flex>
          </IconButton>
        </Flex>
        <SmallCollectionCard />
        <Flex justify="end">
          <Text weight="bold" size="2">
            25 of 125
          </Text>
        </Flex>
        <ItemList items={items} isLoading={isLoading} error={error} />
        <PaginationContainer>
          <PageSelector
            currentPageIndex={page}
            nextDisabled={false}
            onGoToPage={setPage}
            onNextClick={() => setPage(page + 1)}
            onPreviousClick={() => setPage(page - 1)}
            pageCount={5}
            previousDisabled={page === 0}
          />
        </PaginationContainer>
      </Flex>
      <FilterPanel isOpen={isFilterOpen} onClose={toggleFilterPanel} />
    </Flex>
  )
}
