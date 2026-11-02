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
import { findPinnedEntry, mapWithConcurrency, openSetMessage } from '@/library/savedSetItems'
import { getCollectionFinderUrl } from '@/library/catalogUtils'
import type { Collection, Item } from '@/types'

/** Some catalogues rate-limit bursts (Element84 returns 429), so keep this modest. */
const CONCURRENCY = 4
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

    // In add mode, don't fetch items that are already pinned with the same render.
    const pinnedItems = dataFinderStore.getSnapshot().context.pinnedItems
    const alreadyPinned =
      mode === 'add' ? entries.filter((e) => findPinnedEntry(e, pinnedItems)) : []
    const toFetch = entries.filter((entry) => !alreadyPinned.includes(entry))

    // User and workflow-output items need the workspace token. Public items load without it.
    let workspaceToken: string | undefined
    if (token && currentWorkspace && toFetch.length > 0) {
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

    const showProgress = toFetch.length > PROGRESS_THRESHOLD
    const progressToast = showProgress
      ? toast.loading(`Loading ${toFetch.length} items from '${set.name}'…`)
      : undefined
    let done = 0

    // Fetch each collection once, however many of the set's items are in it.
    const collections = new Map<string, Promise<Collection>>()
    const loadCollection = (url: string) => {
      let promise = collections.get(url)
      if (!promise) {
        promise = fetchCollectionByUrl(url, workspaceToken, currentWorkspace, { retry: true }).then(
          (collection) => ({
            ...collection,
            // The finder sets this when it loads a workflow output collection; a direct fetch doesn't.
            isJobCollection: collection.isJobCollection ?? isProcessingResultsUrl(url),
          }),
        )
        // Don't keep a failure: the set's other items in this collection should try again.
        promise.catch(() => collections.delete(url))
        collections.set(url, promise)
      }
      return promise
    }

    const results = await mapWithConcurrency(toFetch, CONCURRENCY, async (entry) => {
      try {
        // selfHref is stored data any workspace member can set, so only send the token to the
        // hub or this workspace's own host.
        const item = await fetchItemByUrl({
          itemUrl: entry.selfHref,
          workspaceToken: canSendWorkspaceToken(resolveApiUrl(entry.selfHref), currentWorkspace)
            ? workspaceToken
            : undefined,
          retry: true,
        })
        const collectionUrl = getCollectionUrl(item)
        if (!collectionUrl) throw new Error(`Item ${entry.itemId} has no collection link`)
        const collection = await loadCollection(collectionUrl)
        return { entry, item, collectionUrl, collection } satisfies LoadedItem
      } finally {
        done += 1
        if (progressToast !== undefined) {
          toast.update(progressToast, {
            render: `Loading items from '${set.name}': ${done} of ${toFetch.length}`,
          })
        }
      }
    })
    if (progressToast !== undefined) toast.dismiss(progressToast)

    const loaded = results
      .filter((r): r is PromiseFulfilledResult<LoadedItem> => r.status === 'fulfilled')
      .map((r) => r.value)
    const failed = toFetch.length - loaded.length

    // Nothing to show: say so before replace mode clears the user's pins.
    if (loaded.length === 0 && alreadyPinned.length === 0) {
      const message = openSetMessage(set.name, {
        total: entries.length,
        newlyPinned: 0,
        alreadyPinned: 0,
        failed,
      })
      toast[message.level](message.text, { autoClose: 8000 })
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

    // In add mode, addPinnedItems also skips items that are already pinned.
    const newlyPinned = dataFinderStore.getSnapshot().context.pinnedItems.length - pinnedBefore

    const message = openSetMessage(set.name, {
      total: entries.length,
      newlyPinned,
      alreadyPinned: alreadyPinned.length + loaded.length - newlyPinned,
      failed,
      singleItemId: entries.length === 1 ? loaded[0]?.item.id ?? entries[0].itemId : undefined,
    })
    toast[message.level](message.text, { autoClose: message.level === 'success' ? 4000 : 8000 })

    // Show the collection of the set's first item that is now pinned, in set order, whether it
    // was just pinned or already was.
    const loadedByEntry = new Map(loaded.map((l) => [l.entry, l]))
    let target: { collection: Collection; isUserCollection: boolean } | undefined
    for (const entry of entries) {
      const justLoaded = loadedByEntry.get(entry)
      if (justLoaded) {
        target = {
          collection: justLoaded.collection,
          isUserCollection: Boolean(entry.display?.isUserCollection),
        }
        break
      }
      const pinned = alreadyPinned.includes(entry) ? findPinnedEntry(entry, pinnedItems) : undefined
      if (pinned?.collectionRef) {
        target = {
          collection: pinned.collectionRef,
          isUserCollection: Boolean(pinned.isUserCollection),
        }
        break
      }
    }
    if (target) {
      localStorage.setItem('openPinnedItemsTab', '1')
      void navigate(
        getCollectionFinderUrl({ ...target.collection, isUserCollection: target.isUserCollection }),
      )
    }
  }
}
