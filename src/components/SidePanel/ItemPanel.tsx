import React from 'react'
import { Flex } from '@radix-ui/themes'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import styles from './SidePanel.module.scss'
import { Collection } from '@/types'

import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'
import { InfoPanelWrapper } from './InfoPanel/InfoPanelWrapper'
import { ItemInfoPanel } from './InfoPanel/ItemInfoPanel'
import { CollectionInfoPanel } from './InfoPanel/CollectionInfoPanel'
import { FilterPanel } from './FilterPanel/FilterPanel'
import Tabs from './Tabs/Tabs'

interface ItemPanelProps {
  collection?: Collection
  setShowCollectionPanel: (show: boolean) => void
}
export const ItemPanel: React.FC<ItemPanelProps> = ({ collection, setShowCollectionPanel }) => {
  const secondaryPanel = useSelector(dataFinderStore, (state) => state.context.secondaryPanel)
  const infoPanelItem = useSelector(dataFinderStore, (state) => state.context.infoPanelItem)

  const isLicenseProprietary = collection?.license === 'proprietary'

  const closeSecondaryPanel = () => dataFinderStore.send({ type: 'closeSecondaryPanel' })

  const isInfoPanelOpen = secondaryPanel === 'item-info' || secondaryPanel === 'collection-info'

  return (
    <>
      <Flex
        className={styles.sidePanel}
        direction="column"
        width="420px"
        p="4"
        gap="2"
        style={{
          boxShadow: secondaryPanel ? 'none' : undefined,
        }}
      >
        <SmallCollectionCard
          onSelectCollectionInfo={() =>
            dataFinderStore.send({ type: 'setSecondaryPanel', panel: 'collection-info' })
          }
          isLicenseProprietary={isLicenseProprietary}
          onChangeCollection={() => setShowCollectionPanel(true)}
        />
        <Tabs />
      </Flex>

      <FilterPanel isOpen={secondaryPanel === 'query-filters'} onClose={closeSecondaryPanel} />

      {/* Show either item or collection info panel, and close the other one if needed */}
      <InfoPanelWrapper isOpen={isInfoPanelOpen}>
        {secondaryPanel === 'item-info' && infoPanelItem && (
          <ItemInfoPanel item={infoPanelItem} onClose={closeSecondaryPanel} />
        )}
        {secondaryPanel === 'collection-info' && (
          <CollectionInfoPanel selectedCollection={collection} onClose={closeSecondaryPanel} />
        )}
      </InfoPanelWrapper>
    </>
  )
}
