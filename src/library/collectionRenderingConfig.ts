import qs from 'qs'
import { Item, BaseStacRender, StacRender } from '@/types'
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

export const resolveTilesUrl = (
  item: Item,
  render: StacRender | undefined,
  isUserCollection?: boolean,
): string | undefined => {
  const configKey = getCollectionConfigKey(item.collection, isUserCollection ?? false)
  const collectionConfig = collectionRenderingConfig[configKey]
  if (!collectionConfig) return undefined
  if (!render) return undefined

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
    // Exclude client-side only properties (auth, quicklook_georeference) from query params
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { auth, quicklook_georeference, ...renderParams } = render
    queryParams = {
      ...queryParams,
      ...renderParams,
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
