import React, { useState, useEffect, useMemo } from 'react'
import { Flex, Tooltip } from '@radix-ui/themes'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import styles from './SidePanel.module.scss'
import { Collection } from '@/types'

import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'
import { InfoPanelWrapper } from './InfoPanel/InfoPanelWrapper'
import { ItemInfoPanel } from './InfoPanel/ItemInfoPanel'
import { CollectionInfoPanel } from './InfoPanel/CollectionInfoPanel'
import { IntegrationToolsPanel } from './InfoPanel/IntegrationToolsPanel'
import { FilterPanel } from './FilterPanel/FilterPanel'
import Tabs from './Tabs/Tabs'
import { isCollectionPurchasable } from '@/library/purchasabilityConfig'

interface ItemPanelProps {
  collection?: Collection
  setShowCollectionPanel: (show: boolean) => void
}
export const ItemPanel: React.FC<ItemPanelProps> = ({ collection, setShowCollectionPanel }) => {
  const secondaryPanel = useSelector(dataFinderStore, (state) => state.context.secondaryPanel)
  const infoPanelItem = useSelector(dataFinderStore, (state) => state.context.infoPanelItem)
  const isUserCollection = useSelector(dataFinderStore, (state) => state.context.isUserCollection)
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)
  const [activeTab, setActiveTab] = useState('query-items-tab')

  // Check for localStorage flag when component mounts, collection changes, or pinned items change (e.g. permalink restore)
  useEffect(() => {
    const shouldOpenPinned = localStorage.getItem('openPinnedItemsTab')
    if (shouldOpenPinned) {
      localStorage.removeItem('openPinnedItemsTab')
      setActiveTab('pinned-items-tab')
    }
  }, [collection, pinnedItems])

  const itemWithCollectionContext = useMemo(() => {
    if (!infoPanelItem || !collection) return infoPanelItem
    const x = {
      ...infoPanelItem,
      collectionRef: collection,
    }
    return x
  }, [infoPanelItem, collection])

  const isLicenseProprietary = isCollectionPurchasable(collection)

  const closeSecondaryPanel = () => dataFinderStore.send({ type: 'closeSecondaryPanel' })

  const isInfoPanelOpen =
    secondaryPanel === 'item-info' ||
    secondaryPanel === 'collection-info' ||
    secondaryPanel === 'integration-tools'
  const isSmallCollectionCardDisabled = activeTab === 'pinned-items-tab'

  const smallCollectionCard = (
    <div>
      <SmallCollectionCard
        onSelectCollectionInfo={() =>
          dataFinderStore.send({
            type: 'setSecondaryPanel',
            panel: secondaryPanel === 'collection-info' ? undefined : 'collection-info',
          })
        }
        isLicenseProprietary={isLicenseProprietary}
        onChangeCollection={() => {
          // For now, just clear the query filter every time we change collections.
          // TODO: We need to 1) Store the filter by collection, and 2) Populate the form with the filter if one exists.
          dataFinderStore.send({ type: 'queryFilterChange', queryFilter: undefined })

          setShowCollectionPanel(true)
        }}
        disabled={isSmallCollectionCardDisabled}
      />
    </div>
  )

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
        {isSmallCollectionCardDisabled ? (
          <Tooltip content="Select the Items tab to access this collection">
            {smallCollectionCard}
          </Tooltip>
        ) : (
          smallCollectionCard
        )}
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      </Flex>

      <FilterPanel isOpen={secondaryPanel === 'query-filters'} onClose={closeSecondaryPanel} />

      {/* Show either item or collection info panel, and close the other one if needed */}
      <InfoPanelWrapper isOpen={isInfoPanelOpen}>
        {secondaryPanel === 'item-info' && itemWithCollectionContext && (
          <ItemInfoPanel
            item={itemWithCollectionContext}
            isUserItem={isUserCollection}
            onClose={closeSecondaryPanel}
          />
        )}
        {secondaryPanel === 'collection-info' && (
          <CollectionInfoPanel selectedCollection={collection} onClose={closeSecondaryPanel} />
        )}
        {secondaryPanel === 'integration-tools' && itemWithCollectionContext && (
          <IntegrationToolsPanel item={itemWithCollectionContext} onClose={closeSecondaryPanel} />
        )}
      </InfoPanelWrapper>
    </>
  )
}
