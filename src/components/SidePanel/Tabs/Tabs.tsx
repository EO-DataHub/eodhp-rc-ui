import { Text, Tooltip } from '@radix-ui/themes'
import { Tabs as T } from 'radix-ui'
import styles from './Tabs.module.scss'
import QueryItemsTab from './QueryItems'
import PinnedItemsTab from './PinnedItems'
import { WorkflowsTab } from '@/demo/components/WorkflowsTab'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

const TabsContent = ({ children, value }: { children: React.ReactNode; value: string }) => (
  <T.Content className={styles.TabsContent} value={value}>
    {children}
  </T.Content>
)

const Tabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) => {
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)

  let pinnedItemsLabel = 'Pinned Items'
  if (pinnedItems.length) {
    pinnedItemsLabel += ` (${pinnedItems.length})`
  }

  return (
    <T.Root
      className={styles.TabsRoot}
      value={activeTab}
      onValueChange={(value) => {
        onTabChange(value)
        dataFinderStore.send({ type: 'closeSecondaryPanel' })
      }}
    >
      <T.List className={styles.TabsList}>
        <Tooltip content="Search results within collection">
          <T.Trigger className={styles.TabsTrigger} value="query-items-tab">
            <Text>Items</Text>
          </T.Trigger>
        </Tooltip>
        <Tooltip content="Selected items (shown on the map interface)">
          <T.Trigger className={styles.TabsTrigger} value="pinned-items-tab">
            <Text>{pinnedItemsLabel}</Text>
          </T.Trigger>
        </Tooltip>
        <Tooltip content="Pick a workflow, then choose the data to run it on">
          <T.Trigger className={styles.TabsTrigger} value="workflows-tab">
            <Text>Workflows</Text>
          </T.Trigger>
        </Tooltip>
      </T.List>
      <TabsContent value="query-items-tab">
        <QueryItemsTab />
      </TabsContent>
      <TabsContent value="pinned-items-tab">
        <PinnedItemsTab />
      </TabsContent>
      <TabsContent value="workflows-tab">
        <WorkflowsTab />
      </TabsContent>
    </T.Root>
  )
}

export default Tabs
