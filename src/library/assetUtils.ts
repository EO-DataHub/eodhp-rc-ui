// Utility to get the COG asset href from an item
import type { Item } from '@/types'

export function getCogAssetHref(item: Item): string | undefined {
  if (item.assets?.cog?.href) {
    return item.assets.cog.href
  }
  if (item.assets) {
    const firstTiffAsset = Object.values(item.assets).find(
      (asset) =>
        typeof asset === 'object' &&
        asset !== null &&
        typeof asset.href === 'string' &&
        'type' in asset &&
        typeof (asset as { type?: unknown }).type === 'string' &&
        (asset as { type: string }).type.includes('image/tiff'),
    )
    if (firstTiffAsset && typeof firstTiffAsset.href === 'string') {
      return firstTiffAsset.href
    }
  }
  return undefined
}
