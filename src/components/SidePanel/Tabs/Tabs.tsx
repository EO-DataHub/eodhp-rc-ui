import { Text } from '@radix-ui/themes'
import { Tabs as T } from 'radix-ui'
import styles from './Tabs.module.scss'
import QueryItemsTab from './QueryItems'

const TabsContent = ({ children, value }: { children: React.ReactNode; value: string }) => (
  <T.Content className={styles.TabsContent} value={value}>
    {children}
  </T.Content>
)

const Tabs = () => {
  return (
    <T.Root className={styles.TabsRoot} defaultValue="query-items-tab">
      <T.List className={styles.TabsList}>
        <T.Trigger className={styles.TabsTrigger} value="query-items-tab">
          <Text>Items</Text>
        </T.Trigger>
        <T.Trigger className={styles.TabsTrigger} value="pinned-items-tab">
          <Text>Pinned Items</Text>
        </T.Trigger>
      </T.List>
      <TabsContent value="query-items-tab">
        <QueryItemsTab />
      </TabsContent>
      <TabsContent value="pinned-items-tab">
        <div>Pinned items tab</div>
      </TabsContent>
    </T.Root>
  )
}

export default Tabs
