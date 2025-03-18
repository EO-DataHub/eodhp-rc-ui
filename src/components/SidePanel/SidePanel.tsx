import React, { useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Item } from '@/types'
import { Collection } from '@/types'
import { ItemPanel } from './ItemPanel'
import { CollectionPanel } from './CollectionPanel'

interface SidePanelProps {
  items: Item[]
  collection?: Collection
  isLoading: boolean
  isFetching: boolean
  error: boolean
  page: number
  setPage: (page: number) => void
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
  const [showCollectionPanel, setShowCollectionPanel] = useState(false)

  return (
    <Flex height={'var(--content-height)'} position="relative" width="100%">
      {showCollectionPanel ? (
        <CollectionPanel />
      ) : (
        <ItemPanel
          items={items}
          collection={collection}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          page={page}
          setPage={setPage}
          setShowCollectionPanel={setShowCollectionPanel}
        />
      )}
    </Flex>
  )
}
