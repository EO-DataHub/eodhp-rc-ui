import { useCallback, useMemo } from 'react'
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

interface PermalinkComputationResult {
  url: string | null
  itemsIncluded: number | null
  canShare: boolean
  tooltip: string
}

function computePermalink(
  primaryCollectionId: string | undefined,
  items: Item[],
  mapInstance: { getBounds: () => LngLatBounds } | null | undefined,
  useLimit: boolean,
): PermalinkComputationResult {
  const canShare = !!primaryCollectionId && items.length > 0 && !!mapInstance

  const tooltip =
    items.length === 0
      ? 'Pin items to share a link'
      : !primaryCollectionId
        ? 'Open a collection to share a link'
        : !mapInstance
          ? 'Map loading…'
          : 'Share link'

  if (!canShare || !primaryCollectionId || !mapInstance) {
    return {
      url: null,
      itemsIncluded: null,
      canShare,
      tooltip,
    }
  }

  const mapBounds = getMapBounds(mapInstance)

  if (useLimit) {
    const { url, itemsIncluded } = buildPermalinkUrlWithLimit(primaryCollectionId, items, mapBounds)
    return {
      url,
      itemsIncluded,
      canShare,
      tooltip,
    }
  }

  const url = buildPermalinkUrl(primaryCollectionId, items, mapBounds)

  return {
    url,
    itemsIncluded: items.length,
    canShare,
    tooltip,
  }
}

export function usePermalink(
  primaryCollectionId: string | undefined,
  items: Item[],
  options: UseCopyPermalinkOptions = {},
): PermalinkComputationResult {
  const { useLimit = false } = options
  const mapInstance = useSelector(dataFinderStore, (state) => state.context.mapInstance)

  return useMemo(
    () => computePermalink(primaryCollectionId, items, mapInstance, useLimit),
    [primaryCollectionId, items, mapInstance, useLimit],
  )
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

  const {
    url,
    itemsIncluded,
    canShare: canCopy,
    tooltip,
  } = usePermalink(primaryCollectionId, items, { useLimit })

  const copyLink = useCallback(() => {
    if (!primaryCollectionId || items.length === 0) {
      if (items.length === 0) toast.info('Pin items to share a link')
      return
    }
    if (!mapInstance) {
      toast.info('Map loading…')
      return
    }

    if (useLimit) {
      if (!url || itemsIncluded == null) return
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
      if (!url) return
      navigator.clipboard.writeText(url).then(
        () => toast.success('Link copied to clipboard'),
        () => toast.error('Failed to copy link'),
      )
    }
  }, [primaryCollectionId, items, mapInstance, useLimit, url, itemsIncluded])

  return { copyLink, canCopy, tooltip }
}
