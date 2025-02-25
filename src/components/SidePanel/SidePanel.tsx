import React, { useState } from 'react'
import { Flex, IconButton, Text } from '@radix-ui/themes'
import { FilterPanel } from './FilterPanel/FilterPanel'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import { ItemCard } from '@/components/ItemCard/ItemCard'
import { Item } from '@/types'
import FilterAltFilled from '@/assets/icons/filter-alt-filled.svg?react'
import styles from './SidePanel.module.scss'
import { Collection } from '@/types'
import { PageSelector } from '../Pagination/PageSelector/PageSelector'
import { MAX_TOTAL_ITEMS, PAGE_SIZE } from '@/pages/DataFinderPage/DataFinderPage'
import { ItemInfoPanel } from './InfoPanel/ItemInfoPanel'

import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { CollectionInfoPanel } from './InfoPanel/CollectionInfoPanel'
import { InfoPanelWrapper } from './InfoPanel/InfoPanelWrapper'
import ItemList from './ItemList'
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator'

interface SidePanelProps {
  items: Item[]
  collection?: Collection
  isLoading: boolean
  isFetching: boolean
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
    totalItemsCount >= MAX_TOTAL_ITEMS ? `${MAX_TOTAL_ITEMS}+` : totalItemsCount
  const startItem = page * PAGE_SIZE + 1
  const endItem = Math.min((page + 1) * PAGE_SIZE, totalItemsCount)
  return (
    <Text size="2" weight="bold">
      {`${startItem}-${endItem} of ${totalCountLabel} items`}
    </Text>
  )
}

export const SidePanel: React.FC<SidePanelProps> = ({
  items,
  collection,
  isLoading,
  isFetching,
  error,
  page,
  setPage,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<Item | null>(null)
  const [checkedItems, setCheckedItems] = useState<Item[]>([])
  const [selectedItemInfo, setSelectedItemInfo] = useState<Item | null>(null)
  const [isCollectionInfoPanelOpen, setIsCollectionInfoPanelOpen] = useState(false)

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev)
  }

  const isLicenseProprietary = collection?.license === 'proprietary'

  const pageCount = Math.ceil(items.length / PAGE_SIZE)

  const sidePanelsOpen = !!selectedItemInfo || isFilterOpen || isCollectionInfoPanelOpen

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item)
  }

  const handleSelectCollectionInfo = () => {
    // Reset item info panel
    setSelectedItemInfo(null)
    setIsCollectionInfoPanelOpen(true)
  }

  const handleSelectItemInfo = (item: Item) => {
    // Reset collection info panel
    setIsCollectionInfoPanelOpen(false)
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
    dataFinderStore.send({ type: 'pinnedItemChange', item, isChecked })
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
        <SmallCollectionCard onSelectCollectionInfo={handleSelectCollectionInfo} />
        <Flex>
          <Flex align="center" gap="2">
            {isFetching && (
              <>
                <LoadingIndicator />
                <Text size="2">Loading...</Text>
              </>
            )}
          </Flex>
          <Flex width="100%" justify="end" gap="2">
            {pageCount > 0 && <PageIndicator page={page} totalItemsCount={items.length} />}
          </Flex>
        </Flex>
        {!isLoading && (
          <ItemList
            items={items.filter(
              (_, index) => index >= page * PAGE_SIZE && index < (page + 1) * PAGE_SIZE,
            )}
            error={error}
            renderItem={(item, index) => (
              <ItemCard
                key={`${item.id}-${index}`}
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
        )}

        {pageCount > 0 && (
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
        )}
      </Flex>

      <FilterPanel isOpen={isFilterOpen} onClose={toggleFilterPanel} />

      {/* Show either item or collection info panel, and close the other one if needed */}
      <InfoPanelWrapper isOpen={!!selectedItemInfo || isCollectionInfoPanelOpen}>
        {selectedItemInfo && (
          <ItemInfoPanel item={selectedItemInfo} onClose={() => setSelectedItemInfo(null)} />
        )}
        {isCollectionInfoPanelOpen && (
          <CollectionInfoPanel onClose={() => setIsCollectionInfoPanelOpen(false)} />
        )}
      </InfoPanelWrapper>
    </Flex>
  )
}
