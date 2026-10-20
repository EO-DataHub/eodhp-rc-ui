import { useNavigate, useParams } from 'react-router-dom'
import { useContext, useState } from 'react'
import { Button, Flex, Grid, Text, Tooltip } from '@radix-ui/themes'
import { useSelector } from '@xstate/store/react'
import { BookmarkIcon, ListBulletIcon, PlusIcon, Share1Icon } from '@radix-ui/react-icons'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { SaveToSetDialog, SaveToSetMode } from '@/components/SavedSets/SaveToSetDialog'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { usePermalink } from '@/hooks/useCopyPermalink'
import { SharePermalinkModal } from '@/components/SharePermalinkModal/SharePermalinkModal'
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
  const [isShareOpen, setIsShareOpen] = useState(false)
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)
  const orderedPinnedItems = [...pinnedItems].reverse()
  const primaryCollectionId = getPrimaryCollectionId(collectionId, orderedPinnedItems)
  const { url, itemsIncluded, canShare, tooltip } = usePermalink(
    primaryCollectionId,
    orderedPinnedItems,
    { useLimit: true },
  )

  return (
    <>
      <Tooltip
        content={
          canShare
            ? 'Copy a link to these pinned items and the current map view (not saved)'
            : tooltip
        }
      >
        <Flex width="fit-content" px="2">
          <Button
            variant="ghost"
            size="2"
            onClick={() => setIsShareOpen(true)}
            disabled={!canShare || !url}
            aria-label="Share view"
          >
            <Share1Icon width="16px" height="16px" />
            <Text>Share view</Text>
          </Button>
        </Flex>
      </Tooltip>
      {url && (
        <SharePermalinkModal
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          url={url}
          itemsIncluded={itemsIncluded}
          totalItems={pinnedItems.length}
          description="This link will open the map with these pinned items and the current map view."
        />
      )}
    </>
  )
}

/**
 * "Save as set", "Add to set" and "Open set". Saved sets need a signed-in workspace, so the buttons
 * are greyed out with a reason rather than hidden, to show the feature exists.
 */
const SavedSetButtons = () => {
  const { isAuthenticated, currentWorkspace } = useContext(AuthenticationContext)
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)
  const hasPinnedItems = pinnedItems.length > 0
  const navigate = useNavigate()
  const [mode, setMode] = useState<SaveToSetMode>()

  const unavailableReason = !isAuthenticated
    ? 'Log in to'
    : !currentWorkspace
      ? 'Select a workspace to'
      : undefined
  const tooltip = (action: string, available: string) =>
    unavailableReason ? `${unavailableReason} ${action}` : available

  return (
    <>
      {hasPinnedItems && (
        <>
          <Tooltip
            content={tooltip(
              'save sets',
              `Save the pinned items as a new set in the ${currentWorkspace} workspace, where all its members can open it`,
            )}
          >
            <Flex width="fit-content" px="2">
              <Button
                variant="ghost"
                size="2"
                onClick={() => setMode('new')}
                disabled={!!unavailableReason}
              >
                <BookmarkIcon width="16px" height="16px" />
                <Text>Save as set</Text>
              </Button>
            </Flex>
          </Tooltip>
          <Tooltip
            content={tooltip(
              'add to sets',
              `Add the pinned items to a set saved in the ${currentWorkspace} workspace`,
            )}
          >
            <Flex width="fit-content" px="2">
              <Button
                variant="ghost"
                size="2"
                onClick={() => setMode('existing')}
                disabled={!!unavailableReason}
              >
                <PlusIcon width="16px" height="16px" />
                <Text>Add to set</Text>
              </Button>
            </Flex>
          </Tooltip>
        </>
      )}
      <Tooltip
        content={tooltip(
          'open saved sets',
          `Open a set saved in the ${currentWorkspace} workspace`,
        )}
      >
        <Flex width="fit-content" px="2">
          <Button
            variant="ghost"
            size="2"
            onClick={() => navigate('/my-data/saved-sets')}
            disabled={!!unavailableReason}
          >
            <ListBulletIcon width="16px" height="16px" />
            <Text>Open set</Text>
          </Button>
        </Flex>
      </Tooltip>
      {hasPinnedItems && !unavailableReason && (
        <SaveToSetDialog
          open={mode !== undefined}
          onOpenChange={(open) => !open && setMode(undefined)}
          items={pinnedItems}
          initialMode={mode ?? 'new'}
        />
      )}
    </>
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
      <Flex gap="2" wrap="wrap" align="center">
        {!isEmpty && (
          <>
            <ClearAllButton />
            <ShareViewButton />
          </>
        )}
        <SavedSetButtons />
      </Flex>
      <Flex direction="column" style={{ overflowY: 'auto', flexGrow: 1 }}>
        <ItemList
          cardType="pinned-item"
          items={[...pinnedItems].reverse()}
          renderItem={(item) => <ItemCard key={item.pinId} item={item} type="pinned-item" />}
        />
      </Flex>
    </Grid>
  )
}

export default PinnedItemsTab
