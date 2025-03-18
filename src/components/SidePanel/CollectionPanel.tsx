import React, { useState } from 'react'
import { Flex, Text, Heading, IconButton, TextField } from '@radix-ui/themes'
import styles from './SidePanel.module.scss'
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

interface CollectionPanelProps {
  onCloseCollectionPanel: () => void
}

export const CollectionPanel: React.FC<CollectionPanelProps> = ({ onCloseCollectionPanel }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedCollectionInfo, setSelectedCollectionInfo] = useState<Collection | null>(null)

  const {
    searchText,
    setSearchText,
    filters,
    setFilters,
    groupBy,
    setGroupBy,
    error,
    filteredCollections,
  } = useCollections()

  const navigate = useNavigate()

  const handleSelectCollectionInfo = (collection: Collection) => {
    // Reset item info panel
    setIsFilterOpen(false)
    setSelectedCollectionInfo(collection)
  }

  const handleChangeCollection = (collection: Collection) => {
    onCloseCollectionPanel()
    setSelectedCollectionInfo(null)
    localStorage.setItem('selectedCollection', JSON.stringify(collection))
    navigate(`/finder/${collection.id}`)
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
          <IconButton size="2" color="gray" variant="outline" onClick={() => setIsFilterOpen(true)}>
            <FilterAltOutlined />
          </IconButton>
        </Flex>
        <ItemList
          items={filteredCollections}
          error={error}
          renderItem={(collection) => (
            <SidePanelCollectionCard
              key={collection.id}
              collection={collection}
              onSelectCollectionInfo={() => handleSelectCollectionInfo(collection)}
              onChangeCollection={() => handleChangeCollection(collection)}
            />
          )}
        />
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
