import { Button, Flex, Grid, Text } from '@radix-ui/themes'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import ItemList from '../ItemList'
import ItemCard from '../../ItemCard/ItemCard'
import { ReloadIcon } from '@radix-ui/react-icons'

const ClearAllButton = () => {
  return (
    <Flex width="fit-content" px="2">
      <Button
        variant="ghost"
        size="2"
        onClick={() => dataFinderStore.send({ type: 'clearAllPinnedItems' })}
      >
        <ReloadIcon width="16px" height="16px" />
        <Text>Clear All</Text>
      </Button>
    </Flex>
  )
}

const PinnedItemsTab = () => {
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)

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
      {!isEmpty && <ClearAllButton />}
      <Flex direction="column" style={{ overflowY: 'auto', flexGrow: 1 }}>
        <ItemList
          cardType="pinned-item"
          items={pinnedItems}
          renderItem={(item) => (
            <ItemCard key={`pinned-item-${item.id}`} item={item} type="pinned-item" />
          )}
        />
      </Flex>
    </Grid>
  )
}

export default PinnedItemsTab
