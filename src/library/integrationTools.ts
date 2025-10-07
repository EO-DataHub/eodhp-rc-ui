import { Item } from '@/types'
import { collectionRenderingConfig, resolveTilesUrl } from './collectionRenderingConfig'

/**
 * Gets the COG asset href from an item
 */
export function getCogAssetHref(item: Item): string | undefined {
  return item.assets?.cog?.href
}

/**
 * Gets the self link href from an item
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
 * Helper: builds a query string from params object
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const query = Object.entries(params)
    .flatMap(([key, value]) => {
      if (value === undefined || value === null) return []
      if (key === 'url') {
        return [`url=${value as string}`]
      }
      if (key === 'rescale') {
        if (
          Array.isArray(value) &&
          value.length === 2 &&
          value.every((v) => typeof v === 'number')
        ) {
          return [`rescale=${value[0]},${value[1]}`]
        }
        if (Array.isArray(value)) {
          return value.map((v) => (Array.isArray(v) ? `rescale=${v[0]},${v[1]}` : `rescale=${v}`))
        }
        return [`rescale=${value as string}`]
      }
      // Generic case: arrays like bidx = [1,2,3]
      if (Array.isArray(value)) {
        return value.map((v) => `${key}=${encodeURIComponent(String(v))}`)
      }
      // Default: safe encode for simple strings/numbers
      return [`${key}=${encodeURIComponent(String(value))}`]
    })
    .join('&')

  return query
}

/**
 * Constructs a titiler XYZ tile service URL for a given item and render.
 * Uses the same logic as resolveTilesUrl to ensure all render parameters are included.
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
    rescale?: string | string[] | [number, number][]
  },
): string | null {
  // If options are provided, build query from them (legacy support)
  if (options) {
    const baseUrl = import.meta.env.VITE_TITILER_BASE_URL
    if (!baseUrl) return null

    const stacUrl = getSelfLinkHref(item) ?? item.assets?.cog?.href
    if (!stacUrl) return null
    const encodedStacUrl = encodeURIComponent(stacUrl)

    const params = {
      url: encodedStacUrl,
      title: options.title ?? 'Natural Color',
      assets: options.assets ?? 'cog',
      bidx: options.bidx ?? [3, 2, 1],
      nodata: options.nodata ?? 0,
      color_formula: options.color_formula ?? 'Gamma RGB 6 Saturation 0.8 Sigmoidal RGB 25 0.35',
      id: options.id ?? 'Natural Color',
      rescale: options.rescale,
    }
    const query = buildQueryString(params)
    return `${baseUrl.replace(/\/$/, '')}/core/stac/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${query}`
  }

  // Use config-driven render with resolveTilesUrl logic
  const renderKeys = Object.keys(collectionRenderingConfig[item.collection]?.renders ?? {})
  if (renderKeys.length === 0) return null

  const config = collectionRenderingConfig[item.collection]
  const selectedRenderId = renderId && config.renders?.[renderId] ? renderId : renderKeys[0]
  const render = config.renders?.[selectedRenderId]
  if (!render) return null

  // Create a StacRender object with the id property for resolveTilesUrl
  const stacRender = {
    ...render,
    id: selectedRenderId,
  }

  // Use resolveTilesUrl to get the properly formatted URL with all parameters
  const tilesUrl = resolveTilesUrl(item, stacRender)
  if (!tilesUrl) return null

  // Convert the tiles URL to XYZ format by replacing the tile coordinates with {z}/{x}/{y} placeholders
  // The resolveTilesUrl returns URLs like: https://titiler/.../10/512/338@1x?params
  // We need to convert this to: https://titiler/.../{z}/{x}/{y}@1x?params
  const xyzUrl = tilesUrl.replace(/\/\d+\/\d+\/\d+@1x/, '/{z}/{x}/{y}@1x')

  return xyzUrl
}

/**
 * Downloads a QLR file for the given item with optional render configuration
 */
export async function downloadQlrForItem(item: Item, renderId?: string): Promise<void> {
  if (!item) {
    throw new Error('Item is required.')
  }

  // Get the XYZ URL with the specified render
  const xyzUrl = getTitilerXyzUrl(item, renderId)
  if (!xyzUrl) {
    throw new Error('Unable to generate XYZ URL for this item.')
  }

  // Create payload with item and XYZ URL
  const payload = {
    item,
    xyzUrl,
    renderId,
  }

  const apiUrl = import.meta.env.VITE_QLR_API_URL || 'http://127.0.0.1:8000/qlr'
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Failed to generate QLR file.')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${item.id}.qlr`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Checks if an item supports integration tools (QGIS/XYZ)
 * Returns true if the collection has at least one render that isn't just a preview
 */
export function supportsIntegrationTools(item: Item): boolean {
  const collectionConfig = collectionRenderingConfig[item.collection]
  if (!collectionConfig?.renders) return false

  const renders = collectionConfig.renders

  // Check if there's at least one render that isn't a preview
  return Object.values(renders).some((render) => {
    // A render is considered a "preview" if it:
    // 1. Has "preview" in the title (case insensitive)
    // 2. Uses only "thumbnail" assets
    // 3. Has quicklook_georeference property
    const isPreviewTitle = render.title.toLowerCase().includes('preview')
    const isThumbnailOnly = render.assets.length === 1 && render.assets[0] === 'thumbnail'
    const hasQuicklookGeoreference = 'quicklook_georeference' in render

    return !(isPreviewTitle || isThumbnailOnly || hasQuicklookGeoreference)
  })
}
