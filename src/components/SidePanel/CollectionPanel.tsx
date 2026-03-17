import React, { useState } from 'react'
import { Flex, Text, Heading, IconButton, TextField, Badge } from '@radix-ui/themes'
import styles from './SidePanel.module.scss'
import listStyles from './ItemList.module.scss'
import { useCollections } from '@/hooks/useCollections'
import ItemList from './ItemList'
import { useNavigate } from 'react-router-dom'
import type { Collection } from '@/types'
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons'
import FilterAltOutlined from '@/assets/icons/filter-alt-outlined.svg?react'
import { SidePanelCollectionCard } from './SidePanelCollectionCard/SidePanelCollectionCard'
import { InfoPanelWrapper } from './InfoPanel/InfoPanelWrapper'
import { CollectionInfoPanel } from './InfoPanel/CollectionInfoPanel'
import { CollectionFilterPanel } from './FilterPanel/CollectionFilterPanel'
import { Callout } from '../Callout/Callout'
import { useAnalyticsActions } from '@/hooks/useGoogleAnalyticsActions'
import { getCollectionFinderUrl } from '@/library/catalogUtils'

interface CollectionPanelProps {
  onCloseCollectionPanel: () => void
}

interface GroupByCollection {
  category: { label: string; value: string }
  collections: Collection[]
}

const renderGroupedByCollections = (
  groupedByCollections: GroupByCollection[],
  onSelectCollectionInfo: (collection: Collection) => void,
  onChangeCollection: (collection: Collection) => void,
) => {
  if (!groupedByCollections) {
    return (
      <Callout
        type="info"
        message="No results found. Modify your filters or search criteria and try again"
      />
    )
  }

  return (
    <Flex direction="column" gap="5" flexGrow="1" className={listStyles.listContainer}>
      {groupedByCollections.map(
        (group) =>
          group.collections.length > 0 && (
            <Flex gap="2" direction="column" key={group.category.value}>
              <Flex gap="2" align="center">
                <Text size="3" weight="bold">
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
              <Flex gap="5" direction="column">
                {group.collections.map((collection) => (
                  <SidePanelCollectionCard
                    key={collection.isUserCollection ? `user-${collection.id}` : collection.id}
                    collection={collection}
                    onSelectCollectionInfo={() => onSelectCollectionInfo(collection)}
                    onChangeCollection={() => onChangeCollection(collection)}
                  />
                ))}
              </Flex>
            </Flex>
          ),
      )}
    </Flex>
  )
}

export const CollectionPanel: React.FC<CollectionPanelProps> = ({ onCloseCollectionPanel }) => {
  const { trackCollectionVisualization } = useAnalyticsActions()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedCollectionInfo, setSelectedCollectionInfo] = useState<Collection | null>(null)

  const {
    searchText,
    setSearchText,
    filters,
    setFilters,
    collectionCount,
    groupedByCollections,
    groupBy,
    setGroupBy,
    error,
    filteredCollections,
  } = useCollections()

  const navigate = useNavigate()

  const handleSelectCollectionInfo = (collection: Collection) => {
    // Reset item info panel
    setIsFilterOpen(false)
    if (selectedCollectionInfo?.id === collection.id) {
      setSelectedCollectionInfo(null)
    } else {
      setSelectedCollectionInfo(collection)
    }
  }

  const handleChangeCollection = (collection: Collection) => {
    onCloseCollectionPanel()
    setSelectedCollectionInfo(null)
    setIsFilterOpen(false)

    const finderUrl = getCollectionFinderUrl(collection)
    void navigate(finderUrl)
    trackCollectionVisualization(collection)
  }

  const handleOpenFilterPanel = () => {
    setIsFilterOpen(true)
    setSelectedCollectionInfo(null)
  }

  return (
    <>
      <Flex
        className={styles.sidePanel}
        direction="column"
        align="start"
        width="420px"
        p="4"
        gap="2"
        style={{
          boxShadow: selectedCollectionInfo !== null || isFilterOpen ? 'none' : undefined,
        }}
      >
        <IconButton size="2" variant="ghost" onClick={onCloseCollectionPanel}>
          <Flex gap="2" align="center">
            <ArrowLeftIcon />
            <Text>Back</Text>
          </Flex>
        </IconButton>
        <Heading as="h2" size="5">
          Data Collections
        </Heading>
        <Flex width="100%" gap="2">
          <TextField.Root
            placeholder="Search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="2"
            style={{ flexGrow: 1 }}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
          </TextField.Root>
          <IconButton size="2" color="gray" variant="outline" onClick={handleOpenFilterPanel}>
            <FilterAltOutlined />
          </IconButton>
        </Flex>

        <Text size="1" style={{ alignSelf: 'flex-end' }}>
          {filteredCollections.length} of {collectionCount}
        </Text>

        {groupBy === 'none' ? (
          <ItemList
            items={filteredCollections}
            cardType="query-item"
            error={!!error}
            renderItem={(collection) => (
              <SidePanelCollectionCard
                key={collection.isUserCollection ? `user-${collection.id}` : collection.id}
                collection={collection}
                onSelectCollectionInfo={() => handleSelectCollectionInfo(collection)}
                onChangeCollection={() => handleChangeCollection(collection)}
              />
            )}
          />
        ) : (
          renderGroupedByCollections(
            groupedByCollections,
            handleSelectCollectionInfo,
            handleChangeCollection,
          )
        )}
      </Flex>

      <CollectionFilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
      />

      <InfoPanelWrapper isOpen={selectedCollectionInfo !== null}>
        {selectedCollectionInfo !== null && (
          <CollectionInfoPanel
            onClose={() => setSelectedCollectionInfo(null)}
            selectedCollection={selectedCollectionInfo}
          />
        )}
      </InfoPanelWrapper>
    </>
  )
}
