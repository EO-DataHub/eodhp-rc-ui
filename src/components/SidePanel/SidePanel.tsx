import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flex, IconButton, Text } from '@radix-ui/themes'
import { FilterPanel } from './FilterPanel/FilterPanel'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import { ItemCard } from '@/components/ItemCard/ItemCard'
import { Item } from '@/types'
import FilterAltFilled from '../../../public/filter-alt-filled.svg?react'
import styles from './SidePanel.module.scss'
import { fetchCollections } from '@/services/collectionService'
import { Collection } from '@/types'
import { PageSelector } from '../Pagination/PageSelector/PageSelector'
import { MAX_TOTAL_ITEMS, PAGE_COUNT, PAGE_SIZE } from '@/pages/DataFinderPage/DataFinderPage'

interface SidePanelProps {
  items: Item[]
  isLoading: boolean
  error: boolean
}

const PaginationContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex justify="center" className={styles.paginationContainer}>
      {children}
    </Flex>
  )
}

const PageIndicator = ({ page, totalItemsCount }: { page: number; totalItemsCount: number }) => {
  const totalCountLabel =
    totalItemsCount > MAX_TOTAL_ITEMS ? `${MAX_TOTAL_ITEMS}+` : totalItemsCount
  const startItem = page * PAGE_SIZE + 1
  const endItem = Math.min((page + 1) * PAGE_SIZE, totalItemsCount)
  return (
    <Text size="2" weight="bold">
      {`${startItem}-${endItem} of ${totalCountLabel}`}
    </Text>
  )
}

const ItemList = ({
  items,
  isLoading,
  error,
  isLicenseProprietary,
  isSARData,
}: {
  items: Item[]
  isLoading: boolean
  error: boolean
  isLicenseProprietary: boolean
  isSARData: boolean
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
          <ItemCard
            key={item.id}
            item={item}
            isLicenseProprietary={isLicenseProprietary}
            isSARData={isSARData()}
          />
        ))}
      </ul>
    </div>
  )
}
export const SidePanel: React.FC<SidePanelProps> = ({ items, isLoading, error }) => {
  const [page, setPage] = useState(0)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev)
  }

  const { data: collectionsData } = useQuery({
    queryKey: ['Collections'],
    queryFn: fetchCollections,
    refetchOnWindowFocus: false,
    enabled: true,
  })

  const collections: Collection[] = collectionsData ?? []

  // this example is illustrative only (same as in itemService)
  // the target collection will be based on user selection input in the future
  const targetCollectionId = 'sentinel2_ard'
  const targetCollection = collections?.find((col) => col.id === targetCollectionId)
  const isLicenseProprietary = targetCollection?.license === 'proprietary'
  const isSARData = (): boolean => targetCollection?.stac_extensions?.[0].includes('/sar/') ?? false

  return (
    <Flex height={'var(--content-height)'} position="relative">
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
          <PageIndicator page={page} totalItemsCount={items.length} />
        </Flex>
        <ItemList
          items={items.filter(
            (_, index) => index >= page * PAGE_SIZE && index < (page + 1) * PAGE_SIZE,
          )}
          isLoading={isLoading}
          error={error}
          isLicenseProprietary={isLicenseProprietary}
          isSARData={isSARData()}
        />
        <PaginationContainer>
          <PageSelector
            currentPageIndex={page}
            nextDisabled={page === PAGE_COUNT - 1}
            onGoToPage={setPage}
            onNextClick={() => setPage(page + 1)}
            onPreviousClick={() => setPage(page - 1)}
            pageCount={PAGE_COUNT}
            previousDisabled={page === 0}
          />
        </PaginationContainer>
      </Flex>
      <FilterPanel isOpen={isFilterOpen} onClose={toggleFilterPanel} />
    </Flex>
  )
}
