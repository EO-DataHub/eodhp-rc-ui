import qs from 'qs'
import { Item, BaseStacRender, Collection, RenderBand, StacRender } from '@/types'
import serverConfig from './configFromServer.json'

const TITILER_URL = import.meta.env.VITE_TITILER_BASE_URL

type TilerType = 'titiler' | 'titiler-multidim'

const tilerUrls: Record<TilerType, string> = {
  titiler: `${TITILER_URL}/core/stac/tiles/WebMercatorQuad/{z}/{x}/{y}@1x`,
  'titiler-multidim': `${TITILER_URL}/xarray/tiles/{z}/{x}/{y}@1x`,
}

interface CollectionConfig {
  renders?: Record<string, BaseStacRender>
  'eodhrc:time-variable-items'?: boolean
  'eodhrc:render-key-properties'?: string[]
  thumbnail_auth?: boolean
  thumbnail_asset?: string
}

interface ServerRenderConfig {
  title: string
  assets: string[]
  bidx?: number[]
  rescale?: [number, number][]
  nodata?: number | string
  colormap?: Record<string, string>
  colormap_name?: string
  color_formula?: string
  expression?: string
  variable?: string
  reference?: boolean
  quicklook_georeference?: string
  auth?: boolean
}

interface ServerCollectionConfig {
  renders: Record<string, ServerRenderConfig>
  'eodhrc:time-variable-items'?: boolean
  'eodhrc:render-key-properties'?: string[]
  thumbnail_auth?: boolean
  thumbnail_asset?: string
}

export function getItemUrl(item: Item): string | undefined {
  return item.links.find((link) => link.rel === 'self')?.href
}

export function getAssetUrl(item: Item, asset: string): string | undefined {
  return item.assets?.[asset]?.href
}

export function getThumbnailAssetUrl(
  item: Item,
  collectionConfig: CollectionConfig | undefined,
): string | undefined {
  // Get configured asset name (defaults to "thumbnail")
  const configuredAsset = collectionConfig?.thumbnail_asset ?? 'thumbnail'

  // First: Try the configured asset
  const configuredUrl = getAssetUrl(item, configuredAsset)
  if (configuredUrl) return configuredUrl

  // Second: If configured asset doesn't exist and it wasn't "thumbnail", try "thumbnail"
  if (configuredAsset !== 'thumbnail') {
    const thumbnailUrl = getAssetUrl(item, 'thumbnail')
    if (thumbnailUrl) return thumbnailUrl
  }

  // Third: If neither exists, return undefined (will show default image)
  return undefined
}

export function getCollectionConfigKey(collectionId: string, isUserCollection: boolean): string {
  return isUserCollection ? `my-${collectionId}` : collectionId
}

export function requiresAuthentication(
  render: BaseStacRender | undefined,
  isUserCollection: boolean,
): boolean {
  if (!render) return false
  if (render.auth === true) return true
  if (render.auth === false) return false
  // Default: require auth if user collection
  return isUserCollection
}

export function requiresThumbnailAuthentication(
  collectionConfig: CollectionConfig | undefined,
  isUserCollection: boolean,
): boolean {
  if (!collectionConfig) return isUserCollection

  // Check explicitly set thumbnail_auth (set during config translation)
  // Note: thumbnail_auth is already explicitly set to true during translation
  // if renders.preview.auth === true, so we don't need to check renders here
  if (collectionConfig.thumbnail_auth === true) return true
  if (collectionConfig.thumbnail_auth === false) return false

  // Default: require auth if user collection
  return isUserCollection
}

/**
 * Copies the EODH-only render fields from a static config render onto a render from STAC.
 * These fields are never taken from STAC, so workflow authors cannot change auth or
 * quicklook handling.
 */
function withStaticOnlyFields(
  render: BaseStacRender,
  staticRender: BaseStacRender | undefined,
): BaseStacRender {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { auth, quicklook_georeference, isFallback, ...stacRender } = render
  return {
    ...stacRender,
    ...(staticRender?.auth !== undefined && { auth: staticRender.auth }),
    ...(staticRender?.quicklook_georeference !== undefined && {
      quicklook_georeference: staticRender.quicklook_georeference,
    }),
  }
}

/**
 * The render used when a collection and its items define none. Each item is drawn from its
 * first COG asset with the tiler's default styling.
 */
export const FALLBACK_RENDER: StacRender = {
  id: 'default',
  title: 'Default visualization',
  assets: [],
  isFallback: true,
}

/**
 * Returns the asset the fallback render draws: the first COG data asset, then the first COG,
 * then the first GeoTIFF data asset, then the first GeoTIFF.
 */
export function getFallbackAsset(item: Item): string | undefined {
  const tiffs = Object.entries(item.assets ?? {}).filter(([, asset]) =>
    asset.type?.includes('image/tiff'),
  )
  const isCog = (type?: string) => !!type?.includes('cloud-optimized')
  const isData = (roles?: string[]) => !!roles?.includes('data')
  const match =
    tiffs.find(([, asset]) => isCog(asset.type) && isData(asset.roles)) ??
    tiffs.find(([, asset]) => isCog(asset.type)) ??
    tiffs.find(([, asset]) => isData(asset.roles)) ??
    tiffs[0]
  return match?.[0]
}

/**
 * Returns the renders for a collection: static config renders, replaced by key with the
 * collection's own STAC renders. Renders are replaced whole, not merged field by field.
 */
export function getCollectionRenders(
  collection: Collection,
  isUserCollection: boolean,
): Record<string, BaseStacRender> {
  const configKey = getCollectionConfigKey(collection.id, isUserCollection)
  const staticRenders = collectionRenderingConfig[configKey]?.renders ?? {}
  const renders = { ...staticRenders }
  for (const [renderId, render] of Object.entries(collection.renders ?? {})) {
    renders[renderId] = withStaticOnlyFields(render, staticRenders[renderId])
  }
  return renders
}

/** Returns the renders defined on an item, as render options. */
export function getItemRenderOptions(item: Item): StacRender[] {
  const renders = (item.properties?.renders ?? {}) as Record<string, BaseStacRender>
  return Object.entries(renders).map(([id, render]) => ({
    ...withStaticOnlyFields(render, undefined),
    id,
  }))
}

/**
 * Returns the render to use for an item: the item's own STAC render with the same key
 * replaces the selected collection render.
 */
export function resolveItemRender(item: Item, render: StacRender | undefined) {
  const itemRender = (item.properties?.renders as Record<string, BaseStacRender> | undefined)?.[
    render?.id ?? ''
  ]
  if (!render || !itemRender) return render
  return { ...withStaticOnlyFields(itemRender, render), id: render.id }
}

type BandMetadata = { name?: string; common_name?: string; 'eo:common_name'?: string }[]

function getBandMetadata(item: Item, asset: string): BandMetadata | undefined {
  const sources = [item.assets?.[asset], item.properties] as Record<string, unknown>[]
  for (const source of sources) {
    for (const key of ['bands', 'eo:bands', 'raster:bands']) {
      const bands = source?.[key]
      if (Array.isArray(bands) && bands.length > 0) return bands as BandMetadata
    }
  }
  return undefined
}

/** Converts a band name to its 1-based index. Unknown names are passed on for the tiler to reject. */
function toBandIndex(item: Item, asset: string, band: RenderBand): RenderBand {
  if (typeof band === 'number') return band
  const index = getBandMetadata(item, asset)?.findIndex((metadata) =>
    [metadata.name, metadata.common_name, metadata['eo:common_name']].includes(band),
  )
  return index !== undefined && index >= 0 ? index + 1 : band
}

/**
 * Converts render bidx to titiler STAC band params. A flat list of indexes is passed as
 * bidx, which titiler applies to every asset. Band names and the per-asset form become
 * asset_bidx, as "<asset>|1,2,3".
 */
function toTilerBandParams(
  item: Item,
  render: StacRender,
): { bidx?: RenderBand[]; asset_bidx?: string[] } {
  const { bidx, assets } = render
  if (!bidx) return {}
  if (Array.isArray(bidx) && bidx.every((band) => typeof band === 'number')) return { bidx }

  const bandsByAsset = Array.isArray(bidx)
    ? assets.map((asset) => [asset, bidx] as const)
    : Object.entries(bidx)
  return {
    bidx: undefined,
    asset_bidx: bandsByAsset.map(
      ([asset, bands]) =>
        `${asset}|${bands.map((band) => toBandIndex(item, asset, band)).join(',')}`,
    ),
  }
}

// Render fields used only by the UI, never sent to the tiler
const CLIENT_ONLY_RENDER_FIELDS = [
  'auth',
  'quicklook_georeference',
  'minmax_zoom',
  'tilematrixsets',
  'isFallback',
]

export const resolveTilesUrl = (
  item: Item,
  selectedRender: StacRender | undefined,
): string | undefined => {
  const itemRender = resolveItemRender(item, selectedRender)
  const fallbackAsset = itemRender?.isFallback ? getFallbackAsset(item) : undefined
  if (!itemRender || (itemRender.isFallback && !fallbackAsset)) return undefined
  const render = fallbackAsset ? { ...itemRender, assets: [fallbackAsset] } : itemRender

  let tilerUrl = undefined
  let urlParam = undefined

  if (render.quicklook_georeference) {
    return undefined
  } else if (render.variable) {
    tilerUrl = tilerUrls['titiler-multidim']
    urlParam = getAssetUrl(item, render.assets[0])
  } else {
    tilerUrl = tilerUrls.titiler
    urlParam = getItemUrl(item)
  }

  let queryParams = {
    url: urlParam,
  } as { url: string; rescale?: string[]; colormap?: string }

  if (render) {
    const renderParams = Object.fromEntries(
      Object.entries(render).filter(([key]) => !CLIENT_ONLY_RENDER_FIELDS.includes(key)),
    )
    queryParams = {
      ...queryParams,
      ...renderParams,
      // The multidim tiler takes bidx as given
      ...(render.variable ? { bidx: render.bidx } : toTilerBandParams(item, render)),
      // Handles rescale parameter which can be either:
      // 1. A nested array of [min,max] pairs: [[0,100], [0,255]]
      // 2. A single [min,max] pair: [0,100]
      // Converts to string array format required by tiler: ["0,100", "0,255"]
      rescale: render.rescale
        ? (Array.isArray(render.rescale[0])
            ? (render.rescale as [number, number][])
            : [render.rescale as [number, number]]
          ).map(([min, max]) => `${min},${max}`)
        : undefined,
      colormap: render.colormap ? JSON.stringify(render.colormap) : undefined,
    }
  }

  const queryString = qs.stringify(queryParams, {
    indices: false,
  })

  return `${tilerUrl}?${queryString}`
}

function translateServerConfigToCollectionConfig(
  serverConfig: Record<string, ServerCollectionConfig>,
): Record<string, CollectionConfig> {
  const result: Record<string, CollectionConfig> = {}

  for (const [collectionId, config] of Object.entries(serverConfig)) {
    const renders = config.renders

    // Create base config
    const baseConfig: CollectionConfig = {
      renders: {},
    }

    // Translate renders
    if (renders) {
      for (const [renderId, renderConfig] of Object.entries(renders)) {
        const optionalProps = {
          bidx: renderConfig.bidx,
          rescale: renderConfig.rescale,
          nodata: renderConfig.nodata,
          colormap: renderConfig.colormap,
          variable: renderConfig.variable,
          colormap_name: renderConfig.colormap_name,
          color_formula: renderConfig.color_formula,
          expression: renderConfig.expression,
          reference: renderConfig.reference,
          quicklook_georeference: renderConfig.quicklook_georeference,
          auth: renderConfig.auth, // <-- Added to include auth property
        }

        const definedProps = Object.fromEntries(
          Object.entries(optionalProps).filter((entry) => entry[1] !== undefined),
        )

        const translatedRender: BaseStacRender = {
          title: renderConfig.title ?? renderId,
          assets: renderConfig.assets,
          ...definedProps,
        }

        baseConfig.renders![renderId] = translatedRender
      }
    }

    if (config['eodhrc:time-variable-items']) {
      baseConfig['eodhrc:time-variable-items'] = config['eodhrc:time-variable-items']
    }

    if (config['eodhrc:render-key-properties']) {
      baseConfig['eodhrc:render-key-properties'] = config['eodhrc:render-key-properties']
    }

    // Explicitly set thumbnail_auth with backward-compatible default
    if (config.thumbnail_auth !== undefined) {
      baseConfig.thumbnail_auth = config.thumbnail_auth
    } else if (renders?.preview?.auth === true) {
      // Explicitly set thumbnail_auth to true when preview requires auth
      baseConfig.thumbnail_auth = true
    }

    // Set thumbnail_asset with default
    baseConfig.thumbnail_asset = config.thumbnail_asset ?? 'thumbnail'

    // Add specific properties based on renderer type
    result[collectionId] = baseConfig
  }

  return result
}

// Type assertion to ensure serverConfig matches ServerCollectionConfig
const typedServerConfig = serverConfig as unknown as Record<string, ServerCollectionConfig>
export const collectionRenderingConfig: Record<string, CollectionConfig> =
  translateServerConfigToCollectionConfig(typedServerConfig)
