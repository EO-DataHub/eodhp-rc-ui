import React, { useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { FilterPanel } from './FilterPanel/FilterPanel'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import styles from './SidePanel.module.scss'
import { Collection } from '@/types'
import { ItemInfoPanel } from './InfoPanel/ItemInfoPanel'

import { CollectionInfoPanel } from './InfoPanel/CollectionInfoPanel'
import { InfoPanelWrapper } from './InfoPanel/InfoPanelWrapper'
import Tabs from './Tabs/Tabs'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

interface SidePanelProps {
  collection?: Collection
}

export const SidePanel: React.FC<SidePanelProps> = ({ collection }) => {
  const secondaryPanel = useSelector(dataFinderStore, (state) => state.context.secondaryPanel)
  const infoPanelItem = useSelector(dataFinderStore, (state) => state.context.infoPanelItem)

  const [isCollectionInfoPanelOpen, setIsCollectionInfoPanelOpen] = useState(false)

  const isLicenseProprietary = collection?.license === 'proprietary'

  const sidePanelsOpen = isCollectionInfoPanelOpen || !!secondaryPanel

  const handleSelectCollectionInfo = () => {
    // Reset item info panel
    setIsCollectionInfoPanelOpen(true)
  }

  const closeSecondaryPanel = () =>
    dataFinderStore.send({ type: 'setSecondaryPanel', panel: undefined })

  const isInfoPanelOpen = secondaryPanel === 'item-info'

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

      <FilterPanel isOpen={secondaryPanel === 'query-filters'} onClose={closeSecondaryPanel} />

      {/* Show either item or collection info panel, and close the other one if needed */}
      <InfoPanelWrapper isOpen={isInfoPanelOpen}>
        {secondaryPanel === 'item-info' && infoPanelItem && (
          <ItemInfoPanel item={infoPanelItem} onClose={closeSecondaryPanel} />
        )}
        {isCollectionInfoPanelOpen && (
          <CollectionInfoPanel onClose={() => setIsCollectionInfoPanelOpen(false)} />
        )}
      </InfoPanelWrapper>
    </Flex>
  )
}
