import { Item } from '@/types'
import { collectionRenderingConfig } from './collectionRenderingConfig'
import integrationConfig from './integrationConfig.json'

// Type definition for integration config
export interface IntegrationConfig {
  [collectionId: string]: Record<string, unknown>
}

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
  const baseUrl = import.meta.env.VITE_TITILER_BASE_URL
  if (!baseUrl) return null

  const stacUrl = getSelfLinkHref(item) ?? item.assets?.cog?.href
  if (!stacUrl) return null
  const encodedStacUrl = encodeURIComponent(stacUrl)

  // If options are provided, build query from them
  if (options) {
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

  // Otherwise, use config-driven render
  const renderKeys = Object.keys(collectionRenderingConfig[item.collection]?.renders ?? {})
  if (renderKeys.length === 0) return null

  const config = collectionRenderingConfig[item.collection]
  const selectedRenderId = renderId && config.renders?.[renderId] ? renderId : renderKeys[0]
  const render = config.renders?.[selectedRenderId]
  if (!render) return null

  const params = {
    url: encodedStacUrl,
    title: render.title,
    assets: render.assets[0],
    bidx: render.bidx,
    nodata: render.nodata,
    color_formula: render.color_formula,
    rescale: render.rescale,
  }
  const query = buildQueryString(params)
  return `${baseUrl.replace(/\/$/, '')}/core/stac/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${query}`
}

/**
 * Downloads a QLR file for the given item
 */
export async function downloadQlrForItem(item: Item): Promise<void> {
  if (!item) {
    throw new Error('Item is required.')
  }

  const apiUrl = import.meta.env.VITE_QLR_API_URL || 'http://127.0.0.1:8000/qlr'
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
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
 */
export function supportsIntegrationTools(item: Item): boolean {
  return item.collection in integrationConfig
}
