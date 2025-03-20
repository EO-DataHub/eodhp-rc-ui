import React, { useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Collection } from '@/types'
import { CollectionPanel } from './CollectionPanel'
import { ItemPanel } from './ItemPanel'

interface SidePanelProps {
  collection?: Collection
}

export const SidePanel: React.FC<SidePanelProps> = ({ collection }) => {
  const [showCollectionPanel, setShowCollectionPanel] = useState(false)

  return (
    <Flex height={'var(--content-height)'} position="relative" width="100%">
      {showCollectionPanel ? (
        <CollectionPanel onCloseCollectionPanel={() => setShowCollectionPanel(false)} />
      ) : (
        <ItemPanel collection={collection} setShowCollectionPanel={setShowCollectionPanel} />
      )}
    </Flex>
  )
}
