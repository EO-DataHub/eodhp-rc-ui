import { InfoCircledIcon, PlusIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Tooltip } from '@radix-ui/themes'
import styles from './ItemCard.module.scss'
import { convertDateToUTCString } from '@/library/dateUtils'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { Item } from '@/types'
import { useSelector } from '@xstate/store/react'

type ItemCardType = 'query-item' | 'pinned-item'

interface ItemCardProps {
  item: Item
  type: ItemCardType
}

const ItemCard = ({ item, type }: ItemCardProps) => {
  const infoPanelItem = useSelector(dataFinderStore, (state) => state.context.infoPanelItem)
  const isSelected = infoPanelItem?.id === item.id

  const collectionRender = useSelector(dataFinderStore, (state) => state.context.collectionRender)

  const isPinned = type === 'pinned-item'
  const isPinnable = type === 'query-item'

  return (
    <Card
      key={`${type}-${item.id}`}
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
    >
      <Flex direction="column" p="2" justify="between" flexGrow="1">
        <Flex direction="column">
          <Flex justify="between">
            <Text weight="bold" size="2" className={styles.text} style={{ maxWidth: 220 }}>
              {item.id}
            </Text>
          </Flex>
          <Text size="1" className={styles.text}>
            {convertDateToUTCString(new Date(item.properties.datetime))}
          </Text>
        </Flex>
        <Flex justify={isPinned ? 'between' : 'end'} gap="2" align="center">
          {isPinned && item.render && (
            <Flex>
              <Text size="1" className={styles.text}>
                {item.render.id}
              </Text>
            </Flex>
          )}
          <Flex justify="end" gap="2" align="center">
            {isPinnable && collectionRender && (
              <Tooltip content="Add item to pinned items with current visualization settings">
                <IconButton
                  radius="full"
                  variant="ghost"
                  className={styles.button}
                  onClick={() =>
                    dataFinderStore.send({ type: 'addPinnedItem', item, collectionRender })
                  }
                >
                  <PlusIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip content="More Info">
              <IconButton
                radius="full"
                variant="ghost"
                className={styles.button}
                onClick={() => dataFinderStore.send({ type: 'openItemInfoPanel', item })}
              >
                <div>
                  <InfoCircledIcon />
                </div>
              </IconButton>
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}

export default ItemCard
