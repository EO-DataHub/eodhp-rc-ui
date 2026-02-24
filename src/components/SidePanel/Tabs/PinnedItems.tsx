import { useParams } from 'react-router-dom'
import { Button, Flex, Grid, Text, Tooltip } from '@radix-ui/themes'
import { useSelector } from '@xstate/store/react'
import { CopyIcon } from '@radix-ui/react-icons'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useCopyPermalink } from '@/hooks/useCopyPermalink'
import ItemList from '../ItemList'
import ItemCard from '../../ItemCard/ItemCard'
import { Cross2Icon } from '@radix-ui/react-icons'

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

/** Route collection id for permalink: current route or derived from first pin (with my- prefix for user collections). */
function getPrimaryCollectionId(
  collectionId: string | undefined,
  pinnedItems: {
    collectionRef?: { id: string } | null
    collection?: string
    isUserCollection?: boolean
  }[],
): string | undefined {
  if (collectionId) return collectionId
  if (pinnedItems.length === 0) return undefined
  const first = pinnedItems[0]
  const rawId = first.collectionRef?.id ?? first.collection ?? ''
  if (!rawId) return undefined
  return first.isUserCollection ? `my-${rawId}` : rawId
}

const ShareViewButton = () => {
  const { collectionId } = useParams<{ collectionId: string }>()
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)
  const primaryCollectionId = getPrimaryCollectionId(collectionId, pinnedItems)
  const {
    copyLink,
    canCopy: canShare,
    tooltip,
  } = useCopyPermalink(primaryCollectionId, pinnedItems, { useLimit: true })

  return (
    <Tooltip content={tooltip}>
      <Flex width="fit-content" px="2">
        <Button
          variant="ghost"
          size="2"
          onClick={copyLink}
          disabled={!canShare}
          aria-label="Copy link"
        >
          <CopyIcon width="16px" height="16px" />
          <Text>Copy link</Text>
        </Button>
      </Flex>
    </Tooltip>
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
      {!isEmpty && (
        <Flex gap="2" wrap="wrap" align="center">
          <ClearAllButton />
          <ShareViewButton />
        </Flex>
      )}
      <Flex direction="column" style={{ overflowY: 'auto', flexGrow: 1 }}>
        <ItemList
          cardType="pinned-item"
          items={pinnedItems}
          renderItem={(item) => <ItemCard key={item.pinId} item={item} type="pinned-item" />}
        />
      </Flex>
    </Grid>
  )
}

export default PinnedItemsTab
