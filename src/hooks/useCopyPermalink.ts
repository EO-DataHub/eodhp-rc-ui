import { useCallback } from 'react'
import { useSelector } from '@xstate/store/react'
import { toast } from 'react-toastify'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { buildPermalinkUrl, buildPermalinkUrlWithLimit, type MapBounds } from '@/utils/permalink'
import type { Item } from '@/types'

function getMapBounds(mapInstance: { getBounds: () => LngLatBounds }): MapBounds {
  const b = mapInstance.getBounds()
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
}

interface LngLatBounds {
  getWest: () => number
  getSouth: () => number
  getEast: () => number
  getNorth: () => number
}

export interface UseCopyPermalinkOptions {
  /** When true, use buildPermalinkUrlWithLimit and show toast when items are omitted. */
  useLimit?: boolean
}

export function useCopyPermalink(
  primaryCollectionId: string | undefined,
  items: Item[],
  options: UseCopyPermalinkOptions = {},
): {
  copyLink: () => void
  canCopy: boolean
  tooltip: string
} {
  const { useLimit = false } = options
  const mapInstance = useSelector(dataFinderStore, (state) => state.context.mapInstance)

  const canCopy = !!primaryCollectionId && items.length > 0 && !!mapInstance

  const tooltip =
    items.length === 0
      ? 'Pin items to share a link'
      : !primaryCollectionId
        ? 'Open a collection to share a link'
        : !mapInstance
          ? 'Map loading…'
          : 'Copy link'

  const copyLink = useCallback(() => {
    if (!primaryCollectionId || items.length === 0) {
      if (items.length === 0) toast.info('Pin items to share a link')
      return
    }
    if (!mapInstance) {
      toast.info('Map loading…')
      return
    }

    const mapBounds = getMapBounds(mapInstance)

    if (useLimit) {
      const { url, itemsIncluded } = buildPermalinkUrlWithLimit(
        primaryCollectionId,
        items,
        mapBounds,
      )
      navigator.clipboard.writeText(url).then(
        () => {
          const omitted = items.length - itemsIncluded
          if (omitted > 0) {
            toast.warning(
              `Link copied: first ${itemsIncluded} items (URL length limit). ${omitted} item${omitted === 1 ? '' : 's'} omitted.`,
              { autoClose: 6000 },
            )
          } else if (items.length > 1) {
            toast.success(`Link copied: ${itemsIncluded} items included`)
          } else {
            toast.success('Link copied to clipboard')
          }
        },
        () => toast.error('Failed to copy link'),
      )
    } else {
      const url = buildPermalinkUrl(primaryCollectionId, items, mapBounds)
      navigator.clipboard.writeText(url).then(
        () => toast.success('Link copied to clipboard'),
        () => toast.error('Failed to copy link'),
      )
    }
  }, [primaryCollectionId, items, mapInstance, useLimit])

  return { copyLink, canCopy, tooltip }
}
