import { getDefaultCollectionRender, resolveTilesUrl } from './collectionRenderingConfig'
import type { Item, StacRender } from '@/types'

/** A pinned item's id: the item and the render it is shown with. */
export const getPinnedItemId = (item: Item, collectionRender: StacRender) =>
  [item.id, collectionRender.id].join('-')

/**
 * Brings pinned items saved by an earlier version of the application up to date with the
 * current render configuration.
 *
 * A pinned item is saved with its render and its tiles URL. If the configuration changes,
 * the saved render can be out of date or gone. For example, items pinned before a collection
 * had any renders keep the placeholder render, whose tiles TiTiler refuses. Each item gets the
 * current definition of its render, by id. Without a match it gets the collection's first
 * render, as in a permalink. Then its tiles URL and pin id are worked out again.
 *
 * Two pins can end up with the same render. Only the first of them is kept.
 */
export function refreshPinnedItems(items: Item[]): Item[] {
  const seen = new Set<string>()
  const refreshed: Item[] = []
  for (const item of items) {
    const isUserCollection = item.isUserCollection ?? false
    const collection = item.collectionRef ?? { id: item.collection }
    const render = getDefaultCollectionRender(collection, isUserCollection, item.render?.id)
    const pinId = getPinnedItemId(item, render)
    if (seen.has(pinId)) continue
    seen.add(pinId)
    refreshed.push({
      ...item,
      pinId,
      render,
      tilesUrl: resolveTilesUrl(item, render, isUserCollection) ?? '',
    })
  }
  return refreshed
}
