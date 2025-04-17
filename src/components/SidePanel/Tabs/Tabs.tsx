import { Text } from '@radix-ui/themes'
import { Tabs as T } from 'radix-ui'
import styles from './Tabs.module.scss'
import QueryItemsTab from './QueryItems'
import PinnedItemsTab from './PinnedItems'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

const TabsContent = ({ children, value }: { children: React.ReactNode; value: string }) => (
  <T.Content className={styles.TabsContent} value={value}>
    {children}
  </T.Content>
)

const Tabs = ({ onTabChange }: { onTabChange: (tab: string) => void }) => {
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)

  let pinnedItemsLabel = 'Pinned Items'
  if (pinnedItems.length) {
    pinnedItemsLabel += ` (${pinnedItems.length})`
  }

  return (
    <T.Root
      className={styles.TabsRoot}
      defaultValue="query-items-tab"
      onValueChange={(value) => {
        onTabChange(value)
        dataFinderStore.send({ type: 'closeSecondaryPanel' })
      }}
    >
      <T.List className={styles.TabsList}>
        <T.Trigger className={styles.TabsTrigger} value="query-items-tab">
          <Text>Items</Text>
        </T.Trigger>
        <T.Trigger className={styles.TabsTrigger} value="pinned-items-tab">
          <Text>{pinnedItemsLabel}</Text>
        </T.Trigger>
      </T.List>
      <TabsContent value="query-items-tab">
        <QueryItemsTab />
      </TabsContent>
      <TabsContent value="pinned-items-tab">
        <PinnedItemsTab />
      </TabsContent>
    </T.Root>
  )
}

export default Tabs
