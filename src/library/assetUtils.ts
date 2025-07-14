// Utility to get the COG asset href from an item
import type { Item } from '@/types'
import { collectionRenderingConfig } from './collectionRenderingConfig'

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
 * Returns the href of the link with rel 'self' from item.links, or undefined if not found.
 */
export function getSelfLinkHref(item: {
  links?: { rel?: string; href?: string }[]
}): string | undefined {
  if (Array.isArray(item.links)) {
    const selfLink = item.links.find((link) => link.rel === 'self' && typeof link.href === 'string')
    return selfLink?.href
  }
  return undefined
}

/**
 * Returns the available render configs for a given collection.
 */

export function getAvailableRenders(collectionId: string): { id: string; title: string }[] {
  return Object.entries(collectionRenderingConfig[collectionId]?.renders ?? {}).map(
    ([id, render]) => ({ id, title: render.title }),
  )
}

/**
 * Constructs a titiler XYZ tile service URL for a given item and render.
 * @param item The item object containing the COG asset.
 * @param renderId Optional render id to use from config.
 * @param options Optional override for titiler parameters (takes precedence over config).
 * @returns The titiler XYZ tile service URL, or null if not available.
 */
export function getTitilerXyzUrl(
  item: Item,
  renderId?: string,
  options?: {
    title?: string
    assets?: string
    bidx?: number[]
    nodata?: number
    color_formula?: string
    id?: string
    rescale?: string | string[]
  },
): string | null {
  const baseUrl = import.meta.env.VITE_TITILER_BASE_URL
  if (!baseUrl) return null

  // If options are provided, use them directly
  if (options) {
    const params = {
      title: options.title ?? 'Natural Color',
      assets: options.assets ?? 'cog',
      bidx: options.bidx ?? [3, 2, 1],
      nodata: options.nodata ?? 0,
      color_formula: options.color_formula ?? 'Gamma RGB 6 Saturation 0.8 Sigmoidal RGB 25 0.35',
      id: options.id ?? 'Natural Color',
      rescale: options.rescale,
    }
    const stacUrl = getSelfLinkHref(item) ?? item.assets?.cog?.href
    if (!stacUrl) return null
    const encodedStacUrl = encodeURIComponent(stacUrl)
    const query =
      `url=${encodedStacUrl}` +
      `&title=${encodeURIComponent(params.title)}` +
      `&assets=${encodeURIComponent(params.assets)}` +
      (params.bidx ? params.bidx.map((b) => `&bidx=${b}`).join('') : '') +
      `&nodata=${params.nodata}` +
      (params.color_formula ? `&color_formula=${encodeURIComponent(params.color_formula)}` : '') +
      `&id=${encodeURIComponent(params.id)}` +
      (params.rescale
        ? Array.isArray(params.rescale)
          ? params.rescale.map((r) => `&rescale=${r}`).join('')
          : `&rescale=${params.rescale}`
        : '')
    return `${baseUrl.replace(/\/$/, '')}/core/stac/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${query}`
  }

  // Otherwise, use config-driven render
  const renderKeys = Object.keys(collectionRenderingConfig[item.collection]?.renders ?? {})
  if (renderKeys.length === 0) return null

  const config = collectionRenderingConfig[item.collection]
  const selectedRenderId = renderId && config.renders?.[renderId] ? renderId : renderKeys[0]
  const render = config.renders?.[selectedRenderId]
  if (!render) return null
  // Use the self link if available, otherwise fallback to COG href
  const stacUrl = getSelfLinkHref(item) ?? item.assets?.cog?.href
  if (!stacUrl) return null
  const encodedStacUrl = encodeURIComponent(stacUrl)

  // Build the query string from render config
  let query = `url=${encodedStacUrl}`
  query += `&title=${encodeURIComponent(render.title)}`
  query += `&assets=${encodeURIComponent(render.assets[0])}`
  if (render.bidx) query += render.bidx.map((b) => `&bidx=${b}`).join('')
  if (render.nodata !== undefined) query += `&nodata=${render.nodata}`
  if (render.color_formula) query += `&color_formula=${encodeURIComponent(render.color_formula)}`
  // Do not reference render.id here
  if (render.rescale) {
    const rescaleArr = Array.isArray(render.rescale[0])
      ? (render.rescale as [number, number][])
      : [render.rescale as [number, number]]
    query += rescaleArr.map(([min, max]) => `&rescale=${min},${max}`).join('')
  }
  return `${baseUrl.replace(/\/$/, '')}/core/stac/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${query}`
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
