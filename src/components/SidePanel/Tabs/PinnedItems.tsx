import { Button, Flex, Grid, Text } from '@radix-ui/themes'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import ItemList from '../ItemList'
import ItemCard from '../../ItemCard/ItemCard'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useState } from 'react'
import PinnedItemsMenuPanel from './PinnedItemsMenuPanel'

const ClearAllButton = () => {
  return (
    <Flex width="fit-content" px="2">
      <Button
        variant="ghost"
        size="2"
        onClick={() => dataFinderStore.send({ type: 'clearAllPinnedItems' })}
      >
        <Cross2Icon width="16px" height="16px" />
        <Text>Clear All</Text>
      </Button>
    </Flex>
  )
}

const BatchActionsButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Flex width="fit-content" px="2">
      <Button variant="solid" size="2" color="blue" onClick={onClick}>
        Batch Actions
      </Button>
    </Flex>
  )
}

const PinnedItemsTab = () => {
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)
  const [showBatchPanel, setShowBatchPanel] = useState(false)

  const isEmpty = pinnedItems.length === 0

  return (
    <Grid
      style={{
        gridTemplateRows: 'auto auto 1fr auto',
        overflow: 'hidden',
        flexGrow: 1,
        gap: 'var(--space-3)',
        paddingTop: 'var(--space-3)',
      }}
    >
      <BatchActionsButton onClick={() => setShowBatchPanel(true)} />
      {!isEmpty && <ClearAllButton />}
      <Flex direction="column" style={{ overflowY: 'auto', flexGrow: 1 }}>
        <ItemList
          cardType="pinned-item"
          items={pinnedItems}
          renderItem={(item) => <ItemCard key={item.pinId} item={item} type="pinned-item" />}
        />
      </Flex>
      {showBatchPanel && (
        <PinnedItemsMenuPanel items={pinnedItems} onClose={() => setShowBatchPanel(false)} />
      )}
    </Grid>
  )
}

export default PinnedItemsTab
