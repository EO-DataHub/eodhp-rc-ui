/**
 * Pinned items are stored bottom-to-top: the last item is drawn on top of the map.
 * The Pinned Items tab lists them in reverse so the top of the list is the top layer.
 */

export const pinnedLayerId = (pinId: string) => `pinned-item-${pinId}`

/** Moves the item with `fromPinId` to where `toPinId` is. Works the same on the reversed list. */
export const movePinnedItem = <T extends { pinId?: string }>(
  items: T[],
  fromPinId: string,
  toPinId: string,
): T[] => {
  const fromIndex = items.findIndex((item) => item.pinId === fromPinId)
  const toIndex = items.findIndex((item) => item.pinId === toPinId)
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return items

  const reordered = [...items]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)
  return reordered
}

/**
 * An invisible layer added before the search footprints, hover outline and drawn area. Pinned layers
 * stack directly under it, so those overlays (added later, so above it) stay visible over imagery.
 */
export const PINNED_LAYERS_ANCHOR_ID = 'pinned-items-anchor'

/**
 * Returns the moves needed to stack the map's pinned layers in `desiredIds` order (bottom-to-top),
 * directly under the anchor layer, as [layerId, beforeId] pairs for `map.moveLayer`.
 * Returns no moves when the layers are already in place, which stops a restack loop on `styledata`.
 */
export const getPinnedLayerMoves = (
  mapLayerOrder: string[],
  desiredIds: string[],
): [string, string][] => {
  const anchorIndex = mapLayerOrder.indexOf(PINNED_LAYERS_ANCHOR_ID)
  if (anchorIndex === -1) return []

  const present = desiredIds.filter((id) => mapLayerOrder.includes(id))
  const underAnchor = mapLayerOrder.slice(anchorIndex - present.length, anchorIndex)
  if (underAnchor.join('\n') === present.join('\n')) return []

  // Moving each layer to just under the anchor, bottom first, leaves them in order
  return present.map((id) => [id, PINNED_LAYERS_ANCHOR_ID])
}
