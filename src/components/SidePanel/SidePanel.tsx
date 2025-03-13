import React, { useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { FilterPanel } from './FilterPanel/FilterPanel'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import { Item } from '@/types'
import styles from './SidePanel.module.scss'
import { Collection } from '@/types'
import { ItemInfoPanel } from './InfoPanel/ItemInfoPanel'

import { CollectionInfoPanel } from './InfoPanel/CollectionInfoPanel'
import { InfoPanelWrapper } from './InfoPanel/InfoPanelWrapper'
import Tabs from './Tabs/Tabs'

interface SidePanelProps {
  collection?: Collection
}

export const SidePanel: React.FC<SidePanelProps> = ({ collection }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedItemInfo, setSelectedItemInfo] = useState<Item | null>(null)
  const [isCollectionInfoPanelOpen, setIsCollectionInfoPanelOpen] = useState(false)

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev)
  }

  const isLicenseProprietary = collection?.license === 'proprietary'

  const sidePanelsOpen = !!selectedItemInfo || isFilterOpen || isCollectionInfoPanelOpen

  const handleSelectCollectionInfo = () => {
    // Reset item info panel
    setSelectedItemInfo(null)
    setIsCollectionInfoPanelOpen(true)
  }

  return (
    <Flex height="var(--content-height)" position="relative" width="100%">
      <Flex
        className={styles.sidePanel}
        direction="column"
        width="420px"
        p="4"
        gap="2"
        style={{
          boxShadow: sidePanelsOpen ? 'none' : undefined,
        }}
      >
        <SmallCollectionCard
          onSelectCollectionInfo={handleSelectCollectionInfo}
          isLicenseProprietary={isLicenseProprietary}
        />
        <Tabs />
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
