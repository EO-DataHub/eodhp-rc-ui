import React, { useState, ReactNode } from 'react'
import { useQueries } from '@tanstack/react-query'
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
import { MAX_TOTAL_ITEMS, PAGE_SIZE } from '@/pages/DataFinderPage/DataFinderPage'
import { MoreInfoPanel } from './MoreInfoPanel/MoreInfoPanel'
import { catalogs } from '@/constants'

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
  renderItem,
}: {
  items: Item[]
  isLoading: boolean
  error: boolean
  renderItem: (item: Item) => ReactNode
}) => {
  if (isLoading) {
    return <Text>Loading Items...</Text>
  }

  if (error) {
    return <Text color="red">Error loading items!</Text>
  }

  return (
    <div className={styles.listContainer}>
      <ul>{items.map((item) => renderItem(item))}</ul>
    </div>
  )
}
export const SidePanel: React.FC<SidePanelProps> = ({ items, isLoading, error, page, setPage }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<Item | null>(null)
  const [checkedItems, setCheckedItems] = useState<Item[]>([])
  const [selectedItemInfo, setSelectedItemInfo] = useState<Item | null>(null)

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev)
  }

  const queries = useQueries({
    queries: catalogs.map((catalog, index) => ({
      queryKey: ['Collections', index],
      queryFn: () => fetchCollections(catalog),
    })),
  })

  const mergedCollections: Collection[] = queries.flatMap(
    (query: { data?: Collection[] }) => query.data ?? [],
  )

  // the target collection will be based on user selection input in the future
  const targetCollectionId = 'sentinel2_ard'
  const targetCollection = mergedCollections?.find((col) => col.id === targetCollectionId)
  const isLicenseProprietary = targetCollection?.license === 'proprietary'

  const pageCount = Math.ceil(items.length / PAGE_SIZE)

  const sidePanelsOpen = !!selectedItemInfo || isFilterOpen

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item)
  }

  const handleSelectItemInfo = (item: Item) => {
    setSelectedItemInfo(item)
  }

  const handleThumbnailSelect = (item: Item) => {
    setSelectedThumbnail((prev) => {
      const isCurrentlySelected = prev?.id === item.id

      if (isCurrentlySelected) {
        setCheckedItems((prevChecked) =>
          prevChecked.filter((checkedItem) => checkedItem.id !== item.id),
        )
        return null
      }

      setCheckedItems((prevChecked) => {
        const isAlreadyChecked = prevChecked.some((i) => i.id === item.id)
        return isAlreadyChecked ? prevChecked : [...prevChecked, item]
      })

      return item
    })
  }

  const handleCheckboxItemChange = (item: Item, isChecked: boolean) => {
    setCheckedItems((prevChecked) =>
      isChecked ? [...prevChecked, item] : prevChecked.filter((checked) => checked.id !== item.id),
    )
  }

  return (
    <Flex height={'var(--content-height)'} position="relative" width="100%">
      <Flex
        className={styles.sidePanel}
        direction="column"
        width="338px"
        p="4"
        gap="2"
        style={{
          boxShadow: sidePanelsOpen ? 'none' : undefined,
        }}
      >
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
          renderItem={(item) => (
            <ItemCard
              key={item.id}
              item={item}
              isSelected={selectedItem?.id === item.id}
              isThumbnailSelected={selectedThumbnail?.id === item.id}
              isChecked={checkedItems.some((checked) => checked.id === item.id)}
              onSelect={handleSelectItem}
              onSelectItemInfo={handleSelectItemInfo}
              onThumbnailSelect={handleThumbnailSelect}
              onCheckboxChange={handleCheckboxItemChange}
              isLicenseProprietary={isLicenseProprietary}
            />
          )}
        />
        <PaginationContainer>
          <PageSelector
            currentPageIndex={page}
            nextDisabled={page === pageCount - 1}
            onGoToPage={setPage}
            onNextClick={() => setPage(page + 1)}
            onPreviousClick={() => setPage(page - 1)}
            pageCount={pageCount}
            previousDisabled={page === 0}
          />
        </PaginationContainer>
      </Flex>
      <FilterPanel isOpen={isFilterOpen} onClose={toggleFilterPanel} />
      <MoreInfoPanel item={selectedItemInfo} onClose={() => setSelectedItemInfo(null)} />
    </Flex>
  )
}
