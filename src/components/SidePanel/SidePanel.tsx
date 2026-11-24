import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { Collection } from '@/types'
import { CollectionPanel } from './CollectionPanel'
import { ItemPanel } from './ItemPanel'

interface SidePanelProps {
  collection?: Collection
}

export const SidePanel: React.FC<SidePanelProps> = ({ collection }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const isDatasetListOpen = useSelector(dataFinderStore, (state) => state.context.isDatasetListOpen)

  // pickDataset opens the dataset list once, e.g. for a tool that runs on several datasets.
  // The parameter is removed so a refresh does not open the list again.
  useEffect(() => {
    if (!searchParams.has('pickDataset')) return
    dataFinderStore.send({ type: 'openDatasetList' })
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('pickDataset')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  // The dataset list starts closed on the next visit to the Data Finder
  useEffect(() => () => dataFinderStore.send({ type: 'closeDatasetList' }), [])

  return (
    <Flex height={'var(--content-height)'} position="relative" width="100%">
      {isDatasetListOpen ? (
        <CollectionPanel
          currentCollection={collection}
          onCloseCollectionPanel={() => dataFinderStore.send({ type: 'closeDatasetList' })}
        />
      ) : (
        <ItemPanel collection={collection} />
      )}
    </Flex>
  )
}
