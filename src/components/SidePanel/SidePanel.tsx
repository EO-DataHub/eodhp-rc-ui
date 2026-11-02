import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { Collection } from '@/types'
import { CollectionPanel } from './CollectionPanel'
import { ItemPanel } from './ItemPanel'

interface SidePanelProps {
  collection?: Collection
}

export const SidePanel: React.FC<SidePanelProps> = ({ collection }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  // pickDataset opens the dataset list, e.g. for a tool that runs on several datasets
  const [showCollectionPanel, setShowCollectionPanel] = useState(() =>
    searchParams.has('pickDataset'),
  )

  // The parameter is a one-off request, so a refresh does not open the dataset list again
  useEffect(() => {
    if (!searchParams.has('pickDataset')) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('pickDataset')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  return (
    <Flex height={'var(--content-height)'} position="relative" width="100%">
      {showCollectionPanel ? (
        <CollectionPanel
          currentCollection={collection}
          onCloseCollectionPanel={() => setShowCollectionPanel(false)}
        />
      ) : (
        <ItemPanel collection={collection} setShowCollectionPanel={setShowCollectionPanel} />
      )}
    </Flex>
  )
}
