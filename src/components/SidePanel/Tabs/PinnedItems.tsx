import { Flex, Grid } from '@radix-ui/themes'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import ItemList from '../ItemList'
import ItemCard from './ItemCard'

const PinnedItemsTab = () => {
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)

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
      <Flex direction="column" style={{ overflowY: 'auto', flexGrow: 1 }}>
        <ItemList
          items={pinnedItems}
          renderItem={(item) => <ItemCard item={item} type="pinned-item" />}
        />
      </Flex>
    </Grid>
  )
}

export default PinnedItemsTab
