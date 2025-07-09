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

/**
 * Downloads a QLR file for the given item by calling the backend API and triggering a file download.
 * Throws an error if the download fails.
 */
export async function downloadQlrForItem(item: import('@/types').Item): Promise<void> {
  const cogUrl = getCogAssetHref(item)
  const collection = item.collection
  if (!cogUrl || !collection) {
    throw new Error('Missing COG URL or collection name.')
  }
  const apiUrl = `http://localhost:8000/qlr?url=${encodeURIComponent(cogUrl)}&collection=${encodeURIComponent(collection)}`
  const response = await fetch(apiUrl)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Failed to generate QLR file.')
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'layer.qlr'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
