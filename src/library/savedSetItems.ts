import type { Item } from '@/types'
import type {
  SavedSetItem,
  SavedSetItemDisplay,
  SavedSetItemInput,
} from '@/services/savedSetsService'
import { resolveApiUrl } from '@/services/apiUrlUtils'

/** The item's own URL: its `self` link, or `{collection}/items/{id}` when the link is missing. */
export const getItemSelfHref = (item: Item): string | undefined => {
  const self = item.links?.find((link) => link.rel === 'self')?.href
  if (self) return resolveApiUrl(self).href

  const collectionUrl =
    item.collectionRef?.links?.find((link) => link.rel === 'self')?.href ??
    item.links?.find((link) => link.rel === 'collection' || link.rel === 'parent')?.href
  if (!collectionUrl) return undefined
  return `${resolveApiUrl(collectionUrl).href.replace(/\/$/, '')}/items/${encodeURIComponent(item.id)}`
}

/**
 * Converts an item to a set reference. `display` keeps how the item looks on the map, so
 * opening the set restores it. Returns undefined when the item has no URL to load it from.
 */
export const toSavedSetItemInput = (
  item: Item,
  display: SavedSetItemDisplay = {},
): SavedSetItemInput | undefined => {
  const selfHref = getItemSelfHref(item)
  if (!selfHref) return undefined
  return {
    collectionId: item.collectionRef?.id ?? item.collection,
    itemId: item.id,
    selfHref,
    display: {
      renderId: item.render?.id,
      visible: item.mapRender?.visible ?? true,
      opacity: item.mapRender?.opacity ?? 1,
      isUserCollection: Boolean(item.isUserCollection),
      ...display,
    },
  }
}

/**
 * Converts items to set references. A set holds each item once, so an item pinned with several
 * renders is saved with the first one. Counts items with no URL (`skipped`) and the extra pins
 * that were merged (`merged`).
 */
export const toSavedSetItemInputs = (items: Item[]) => {
  const bySelfHref = new Map<string, SavedSetItemInput>()
  let skipped = 0
  for (const item of items) {
    const input = toSavedSetItemInput(item)
    if (!input) skipped += 1
    else if (!bySelfHref.has(input.selfHref)) bySelfHref.set(input.selfHref, input)
  }
  const inputs = [...bySelfHref.values()]
  return { inputs, skipped, merged: items.length - skipped - inputs.length }
}

/** Runs `fn` on each value with at most `limit` calls in flight. Results keep the input order. */
export const mapWithConcurrency = async <T, R>(
  values: T[],
  limit: number,
  fn: (value: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = new Array(values.length)
  let next = 0
  const worker = async () => {
    while (next < values.length) {
      const index = next++
      try {
        results[index] = { status: 'fulfilled', value: await fn(values[index], index) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker))
  return results
}

/**
 * Finds the pinned item an entry would add, so add mode can skip fetching it. Only matches when
 * the entry names its render: without one the render comes from the collection, which isn't
 * known until it loads.
 */
export const findPinnedEntry = (entry: SavedSetItem, pinnedItems: Item[]): Item | undefined => {
  const renderId = entry.display?.renderId
  if (!renderId) return undefined
  return pinnedItems.find(
    (pinned) => pinned.render?.id === renderId && getItemSelfHref(pinned) === entry.selfHref,
  )
}

interface OpenSetCounts {
  /** Entries asked for. */
  total: number
  newlyPinned: number
  alreadyPinned: number
  failed: number
  /** Item id to name when the set has one entry. */
  singleItemId?: string
}

/** The toast after opening a set: what was pinned, what was already pinned, and what failed. */
export const openSetMessage = (
  setName: string,
  { total, newlyPinned, alreadyPinned, failed, singleItemId }: OpenSetCounts,
): { level: 'success' | 'warning' | 'error'; text: string } => {
  if (newlyPinned === 0 && alreadyPinned === 0) {
    return {
      level: 'error',
      text: `None of the items in '${setName}' could be loaded. Try again. They may have been deleted, or you may not have access to them.`,
    }
  }

  let pinned: string
  if (newlyPinned === 0) {
    pinned =
      alreadyPinned === 1 && total === 1
        ? 'This item is already pinned'
        : `${failed === 0 ? 'All ' : ''}${alreadyPinned} ${alreadyPinned === 1 ? 'item is' : 'items are'} already pinned`
  } else {
    const what =
      newlyPinned === 1
        ? total === 1 && singleItemId
          ? singleItemId
          : '1 item'
        : `${newlyPinned} items`
    pinned =
      alreadyPinned === 0
        ? `Pinned ${what} from '${setName}'`
        : `Pinned ${what} from '${setName}' (${alreadyPinned} already pinned)`
  }

  if (failed === 0) return { level: 'success', text: pinned }
  return {
    level: 'warning',
    text: `${pinned}. ${failed} of ${total} ${total === 1 ? 'item' : 'items'} couldn't be loaded. Try again. They may have been deleted, or you may not have access to them.`,
  }
}
