/**
 * Helpers for permalink URL params: item id(s) + map bounds.
 * Bounds order: [west, south, east, north] (WGS84).
 * Multi-collection: items param uses "collectionId:encodedItemId|..." (itemId encoded so it can contain "/").
 * Legacy: "collectionId/itemId|..." or "id1|id2" (single collection from path) for backward compatibility.
 */

import type { Item } from '@/types'

export type MapBounds = [number, number, number, number]

const BOUNDS_MIN_LON = -180
const BOUNDS_MAX_LON = 180
const BOUNDS_MIN_LAT = -90
const BOUNDS_MAX_LAT = 90

export interface ItemByCollection {
  collectionId: string
  itemId: string
  /** Id of the render/visualisation the item was pinned with, so the recipient sees the same visualisation. */
  renderId?: string
}

export interface ParsedPermalink {
  /** Legacy single-collection item IDs (when items param has no "/" or ":"). */
  itemIds: string[]
  /** Multi-collection items (when items param uses "collectionId:encodedItemId" or "collectionId/itemId" format). */
  itemsByCollection: ItemByCollection[]
  bounds: MapBounds | null
}

/** Delimiter between multiple item segments in the items param. */
const ITEM_IDS_DELIMITER = '|'
/** Delimiter between collection id and (encoded) item id in a segment. Enables item ids to contain "/". */
const COLLECTION_ITEM_DELIMITER = ':'

/**
 * Route-form collection id for permalink: use "my-{id}" for user collections so the link opens the correct collection.
 */
function routeCollectionId(item: Item, primaryCollectionId: string): string {
  const rawId =
    item.collectionRef?.id ??
    item.collection ??
    (primaryCollectionId.startsWith('my-') ? primaryCollectionId.slice(3) : primaryCollectionId)
  return item.isUserCollection ? `my-${rawId}` : rawId
}

/**
 * Encode pinned items as "collectionId:encodeURIComponent(itemId):encodeURIComponent(renderId)|..."
 * so item ids can contain "/" and the recipient's link opens with the same visualisation the item was pinned with.
 * The renderId segment is omitted when the item has no render.
 */
function encodeItemsParam(items: Item[], primaryCollectionId: string): string {
  return items
    .map((item) => {
      const cId = routeCollectionId(item, primaryCollectionId)
      const renderPart = item.render?.id
        ? `${COLLECTION_ITEM_DELIMITER}${encodeURIComponent(item.render.id)}`
        : ''
      return `${cId}${COLLECTION_ITEM_DELIMITER}${encodeURIComponent(item.id)}${renderPart}`
    })
    .join(ITEM_IDS_DELIMITER)
}

/**
 * Safe max length for the full permalink URL (browsers/address bars often truncate around 2000 chars).
 * We use a conservative limit so the link works when pasted elsewhere.
 */
export const MAX_PERMALINK_URL_LENGTH = 1800

/**
 * Parse one segment into collectionId + itemId (+ optional renderId). Supports:
 * - New format "collectionId:encodedItemId[:encodedRenderId]" (decodeURIComponent so ids can contain "/").
 * - Legacy "collectionId/itemId" (itemId = rest after first "/").
 */
function parseSegment(segment: string): ItemByCollection | null {
  const colonIndex = segment.indexOf(COLLECTION_ITEM_DELIMITER)
  if (colonIndex !== -1) {
    const collectionId = segment.slice(0, colonIndex).trim()
    const rest = segment.slice(colonIndex + 1)
    const nextColonIndex = rest.indexOf(COLLECTION_ITEM_DELIMITER)
    const encodedItemId = nextColonIndex !== -1 ? rest.slice(0, nextColonIndex) : rest
    const encodedRenderId = nextColonIndex !== -1 ? rest.slice(nextColonIndex + 1) : ''
    if (!collectionId || !encodedItemId) return null
    try {
      const itemId = decodeURIComponent(encodedItemId)
      const renderId = encodedRenderId ? decodeURIComponent(encodedRenderId) : undefined
      return { collectionId, itemId, renderId }
    } catch {
      return null
    }
  }
  if (segment.includes('/')) {
    const [collectionId, ...rest] = segment.split('/')
    const itemId = rest.join('/')
    return collectionId?.trim() && itemId ? { collectionId: collectionId.trim(), itemId } : null
  }
  return null
}

/**
 * Parse permalink query params from URL search params.
 * Prefers single "items" param; falls back to multiple "item" params for backward compatibility.
 * Segments with ":" use new format (collectionId:encodeURIComponent(itemId)); segments with "/" use legacy (collectionId/itemId); else single-collection item IDs.
 */
export function parsePermalinkParams(searchParams: URLSearchParams): ParsedPermalink {
  const itemsParam = searchParams.get('items')
  const rawSegments =
    itemsParam !== null && itemsParam !== ''
      ? itemsParam
          .split(ITEM_IDS_DELIMITER)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : searchParams
          .getAll('item')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

  const hasMultiCollectionFormat = rawSegments.some(
    (s) => s.includes(COLLECTION_ITEM_DELIMITER) || s.includes('/'),
  )
  let itemIds: string[] = []
  let itemsByCollection: ItemByCollection[] = []

  if (hasMultiCollectionFormat) {
    itemsByCollection = rawSegments
      .map((segment) => parseSegment(segment))
      .filter(
        (p): p is ItemByCollection =>
          p !== null && p.collectionId.length > 0 && p.itemId.length > 0,
      )
  } else {
    itemIds = rawSegments
  }

  const boundsRaw = searchParams.get('bounds')
  let bounds: MapBounds | null = null

  if (boundsRaw) {
    const parts = boundsRaw.split(',').map((s) => s.trim())
    if (parts.length === 4) {
      const nums = parts.map((s) => parseFloat(s))
      const valid =
        nums.every((n) => Number.isFinite(n)) &&
        nums[0] >= BOUNDS_MIN_LON &&
        nums[0] <= BOUNDS_MAX_LON &&
        nums[1] >= BOUNDS_MIN_LAT &&
        nums[1] <= BOUNDS_MAX_LAT &&
        nums[2] >= BOUNDS_MIN_LON &&
        nums[2] <= BOUNDS_MAX_LON &&
        nums[3] >= BOUNDS_MIN_LAT &&
        nums[3] <= BOUNDS_MAX_LAT &&
        nums[0] <= nums[2] &&
        nums[1] <= nums[3]
      if (valid) {
        bounds = [nums[0], nums[1], nums[2], nums[3]]
      }
    }
  }

  return { itemIds, itemsByCollection, bounds }
}

/**
 * Build the hash part of a permalink URL (path + query).
 * primaryCollectionId is the route param (e.g. "sentinel-2" or "my-xyz"); items are encoded as collectionId/itemId for multi-collection support.
 */
export function buildPermalinkHash(
  primaryCollectionId: string,
  items: Item[],
  bounds: MapBounds,
): string {
  const params = new URLSearchParams()
  if (items.length > 0) {
    params.set('items', encodeItemsParam(items, primaryCollectionId))
  }
  params.set('bounds', bounds.join(','))
  const query = params.toString()
  return `#/finder/${encodeURIComponent(primaryCollectionId)}${query ? `?${query}` : ''}`
}

/**
 * Build full absolute URL for a permalink (for copying to clipboard).
 */
export function buildPermalinkUrl(
  primaryCollectionId: string,
  items: Item[],
  bounds: MapBounds,
): string {
  const hash = buildPermalinkHash(primaryCollectionId, items, bounds)
  return `${window.location.origin}${window.location.pathname}${hash}`
}

export interface BuildPermalinkResult {
  url: string
  itemsIncluded: number
}

/**
 * Build permalink URL that fits within max length by including only the first N items if needed.
 * Use this when copying a link with many pinned items so the URL works when pasted elsewhere.
 */
export function buildPermalinkUrlWithLimit(
  primaryCollectionId: string,
  items: Item[],
  bounds: MapBounds,
  maxLength: number = MAX_PERMALINK_URL_LENGTH,
): BuildPermalinkResult {
  const base = `${window.location.origin}${window.location.pathname}`
  let n = items.length
  let url = base + buildPermalinkHash(primaryCollectionId, items.slice(0, n), bounds)
  while (url.length > maxLength && n > 1) {
    n -= 1
    url = base + buildPermalinkHash(primaryCollectionId, items.slice(0, n), bounds)
  }
  return { url, itemsIncluded: n }
}
