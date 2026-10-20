import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchCollectionByUrl, fetchItemByUrl } from '@/services/itemService'
import { canSendWorkspaceToken, resolveApiUrl } from '@/services/apiUrlUtils'
import type { SavedSet, SavedSetItem } from '@/services/savedSetsService'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { getDefaultCollectionRender } from '@/pages/DataFinderPage/permalinkRestore'
import { isCollectionPurchasable } from '@/library/purchasabilityConfig'
import { mapWithConcurrency } from '@/library/savedSetItems'
import { getCollectionFinderUrl } from '@/library/catalogUtils'
import type { Collection, Item } from '@/types'

const CONCURRENCY = 6
/** Sets larger than this show a progress toast while their items load. */
const PROGRESS_THRESHOLD = 20

export type OpenSetMode = 'replace' | 'add'

interface LoadedItem {
  entry: SavedSetItem
  item: Item
  collectionUrl: string
  collection: Collection
}

const isProcessingResultsUrl = (url: string) => url.includes('/catalogs/processing-results/')

const getCollectionUrl = (item: Item) =>
  item.links?.find((link) => link.rel === 'collection')?.href ??
  item.links?.find((link) => link.rel === 'parent')?.href

const pinnedMessage = (setName: string, loaded: LoadedItem[], newlyPinned: number) => {
  const alreadyPinned = loaded.length - newlyPinned
  if (newlyPinned === 0) {
    return loaded.length === 1
      ? 'This item is already pinned'
      : `All ${loaded.length} items are already pinned`
  }
  const pinned =
    newlyPinned === 1
      ? `Pinned ${loaded.length === 1 ? loaded[0].item.id : '1 item'}`
      : `Pinned ${newlyPinned} items`
  return alreadyPinned === 0
    ? `${pinned} from '${setName}'`
    : `${pinned} from '${setName}' (${alreadyPinned} already pinned)`
}

/**
 * Loads a saved set's items from their selfHref and pins them in the Data Finder. Items are
 * fetched with the reader's own permissions, so items they can't access are skipped and counted.
 */
export const useOpenSavedSet = () => {
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return async (set: SavedSet, mode: OpenSetMode, onlyEntryIds?: string[]) => {
    const entries = onlyEntryIds
      ? set.items.filter((entry) => onlyEntryIds.includes(entry.id))
      : set.items
    if (entries.length === 0) {
      // The set was refetched and someone else removed these items since the page loaded.
      toast.info(
        onlyEntryIds?.length === 1
          ? `This item is no longer in '${set.name}'.`
          : `These items are no longer in '${set.name}'.`,
      )
      return
    }

    // User and workflow-output items need the workspace token. Public items load without it.
    let workspaceToken: string | undefined
    if (token && currentWorkspace) {
      try {
        const tokens = await queryClient.fetchQuery({
          queryKey: ['WorkspaceTokens', currentWorkspace, userInfo?.sub],
          queryFn: () => fetchWorkspaceTokens(currentWorkspace, token),
        })
        workspaceToken = tokens.access
      } catch {
        // Carry on: public items still load.
      }
    }

    const showProgress = entries.length > PROGRESS_THRESHOLD
    const progressToast = showProgress
      ? toast.loading(`Loading ${entries.length} items from '${set.name}'…`)
      : undefined
    let done = 0

    // Fetch each collection once, however many of the set's items are in it.
    const collections = new Map<string, Promise<Collection>>()
    const loadCollection = (url: string) => {
      let promise = collections.get(url)
      if (!promise) {
        promise = fetchCollectionByUrl(url, workspaceToken, currentWorkspace).then(
          (collection) => ({
            ...collection,
            // The finder sets this when it loads a workflow output collection; a direct fetch doesn't.
            isJobCollection: collection.isJobCollection ?? isProcessingResultsUrl(url),
          }),
        )
        collections.set(url, promise)
      }
      return promise
    }

    const results = await mapWithConcurrency(entries, CONCURRENCY, async (entry) => {
      try {
        // selfHref is stored data any workspace member can set, so only send the token to the
        // hub or this workspace's own host.
        const item = await fetchItemByUrl({
          itemUrl: entry.selfHref,
          workspaceToken: canSendWorkspaceToken(resolveApiUrl(entry.selfHref), currentWorkspace)
            ? workspaceToken
            : undefined,
        })
        const collectionUrl = getCollectionUrl(item)
        if (!collectionUrl) throw new Error(`Item ${entry.itemId} has no collection link`)
        const collection = await loadCollection(collectionUrl)
        return { entry, item, collectionUrl, collection } satisfies LoadedItem
      } finally {
        done += 1
        if (progressToast !== undefined) {
          toast.update(progressToast, {
            render: `Loading items from '${set.name}': ${done} of ${entries.length}`,
          })
        }
      }
    })
    if (progressToast !== undefined) toast.dismiss(progressToast)

    const loaded = results
      .filter((r): r is PromiseFulfilledResult<LoadedItem> => r.status === 'fulfilled')
      .map((r) => r.value)
    const failed = entries.length - loaded.length

    if (loaded.length === 0) {
      toast.error(
        `None of the items in '${set.name}' could be loaded. They may have been deleted, or you may not have access to them.`,
      )
      return
    }

    if (mode === 'replace') {
      dataFinderStore.send({ type: 'clearAllPinnedItems' })
    }

    const pinnedBefore = dataFinderStore.getSnapshot().context.pinnedItems.length

    // addPinnedItems takes one collection and render per call, so group by both. Group by
    // collection URL, not id: collections in different catalogues can share an id.
    const groups = new Map<string, LoadedItem[]>()
    for (const loadedItem of loaded) {
      const { collectionUrl, entry } = loadedItem
      const key = [
        collectionUrl,
        entry.display?.renderId ?? '',
        Boolean(entry.display?.isUserCollection),
      ].join('\u0000')
      groups.set(key, [...(groups.get(key) ?? []), loadedItem])
    }
    groups.forEach((group) => {
      const { collection, entry } = group[0]
      const isUserCollection = Boolean(entry.display?.isUserCollection)
      dataFinderStore.send({
        type: 'addPinnedItems',
        items: group.map((g) => g.item),
        collectionRender: getDefaultCollectionRender(
          collection,
          isUserCollection,
          entry.display?.renderId,
        ),
        isLicenseProprietary: isCollectionPurchasable(collection),
        isUserCollection,
        collectionName: collection.title ?? collection.id,
        collection,
        mapRenderByItemId: Object.fromEntries(
          group.map((g) => [
            g.item.id,
            {
              visible: g.entry.display?.visible ?? true,
              opacity: g.entry.display?.opacity ?? 1,
            },
          ]),
        ),
      })
    })

    // In add mode, addPinnedItems skips items that are already pinned.
    const newlyPinned = dataFinderStore.getSnapshot().context.pinnedItems.length - pinnedBefore

    if (failed > 0) {
      toast.warning(
        `${failed} of ${entries.length} items couldn't be loaded. They may have been deleted, or you may not have access to them.`,
        { autoClose: 8000 },
      )
    } else {
      toast.success(pinnedMessage(set.name, loaded, newlyPinned), { autoClose: 4000 })
    }

    const first = loaded[0]
    localStorage.setItem('openPinnedItemsTab', '1')
    void navigate(
      getCollectionFinderUrl({
        ...first.collection,
        isUserCollection: Boolean(first.entry.display?.isUserCollection),
      }),
    )
  }
}
