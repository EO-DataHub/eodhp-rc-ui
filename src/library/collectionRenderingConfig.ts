/* eslint-disable no-console */
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
  rescale?: number[][] | number[] // JSON can have number[][] or number[] (single pair)
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

/**
 * Filters assets by type pattern (e.g., 'image/tiff').
 * Returns an array of asset keys and their asset objects that match the type pattern.
 * @param assets - The item's assets object
 * @param typePattern - The type pattern to match (e.g., 'image/tiff')
 * @returns Array of { key, asset } objects where asset type includes the pattern
 */
export function getAssetsByType(
  assets: Item['assets'],
  typePattern: string,
): { key: string; asset: Item['assets'][string] }[] {
  if (!assets) return []

  return Object.entries(assets)
    .filter(([, asset]) => {
      // Check if asset has a type property that includes the pattern
      // Assets may have type as a property or we may need to check other properties
      const assetType = (asset as { type?: string }).type
      return assetType?.includes(typePattern) ?? false
    })
    .map(([key, asset]) => ({ key, asset }))
}

export function getThumbnailAssetUrl(
  item: Item,
  collectionConfig: CollectionConfig | undefined,
): string | undefined {
  if (!collectionConfig) return undefined

  // First: Try configured thumbnail asset
  const configuredAsset = collectionConfig.thumbnail_asset ?? 'thumbnail'
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
  assetKey?: string,
): string | undefined => {
  console.log('[resolveTilesUrl] Called', {
    itemId: item.id,
    collection: item.collection,
    isUserCollection,
    hasRender: !!render,
    assetKey,
  })

  const configKey = getCollectionConfigKey(item.collection, isUserCollection ?? false)
  const collectionConfig = collectionRenderingConfig[configKey]

  console.log('[resolveTilesUrl] Config lookup', {
    configKey,
    hasCollectionConfig: !!collectionConfig,
    renderId: render?.id,
  })

  // For job collections, we might not have a config, but we can still generate a URL if we have a render
  if (!collectionConfig && !render) {
    console.log('[resolveTilesUrl] No config and no render, returning undefined')
    return undefined
  }

  if (!render) {
    console.log('[resolveTilesUrl] No render, returning undefined')
    return undefined
  }

  let tilerUrl = undefined
  let urlParam = undefined

  if (render.quicklook_georeference) {
    console.log('[resolveTilesUrl] quicklook_georeference, returning undefined')
    return undefined
  } else if (render.variable) {
    tilerUrl = tilerUrls['titiler-multidim']
    urlParam = getAssetUrl(item, render.assets[0])
  } else {
    tilerUrl = tilerUrls.titiler
    urlParam = getItemUrl(item)
  }

  console.log('[resolveTilesUrl] URL params', {
    tilerUrl,
    urlParam,
    hasUrlParam: !!urlParam,
  })

  if (!urlParam) {
    console.log('[resolveTilesUrl] No urlParam, returning undefined')
    return undefined
  }

  let queryParams = {
    url: urlParam,
  } as { url: string; assets?: string; rescale?: string[]; colormap?: string }

  // Add asset key if provided (for job collections)
  if (assetKey) {
    queryParams.assets = assetKey
  }

  if (render) {
    // Exclude client-side only properties (auth, quicklook_georeference) from query params
    // Also exclude assets if assetKey is provided (for job collections)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { auth, quicklook_georeference, assets, ...renderParams } = render
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

  const result = `${tilerUrl}?${queryString}`
  console.log('[resolveTilesUrl] Result', { result })
  return result
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
        // Transform rescale from number[][] or number[] to [number, number][] if present
        const rescale = renderConfig.rescale
          ? Array.isArray(renderConfig.rescale[0])
            ? // It's number[][] - array of pairs
              (renderConfig.rescale as number[][]).map((pair): [number, number] => {
                if (
                  Array.isArray(pair) &&
                  pair.length === 2 &&
                  typeof pair[0] === 'number' &&
                  typeof pair[1] === 'number'
                ) {
                  return [pair[0], pair[1]]
                }
                throw new Error(`Invalid rescale pair: ${JSON.stringify(pair)}`)
              })
            : // It's number[] - single pair, wrap it
              renderConfig.rescale.length === 2 &&
                typeof renderConfig.rescale[0] === 'number' &&
                typeof renderConfig.rescale[1] === 'number'
              ? [[renderConfig.rescale[0], renderConfig.rescale[1]] as [number, number]]
              : undefined
          : undefined

        const optionalProps = {
          bidx: renderConfig.bidx,
          rescale,
          nodata: renderConfig.nodata,
          colormap: renderConfig.colormap,
          colormap_name: renderConfig.colormap_name,
          color_formula: renderConfig.color_formula,
          expression: renderConfig.expression,
          variable: renderConfig.variable,
          reference: renderConfig.reference,
          quicklook_georeference: renderConfig.quicklook_georeference,
          auth: renderConfig.auth,
        }

        // Remove undefined values
        const cleanedProps = Object.fromEntries(
          Object.entries(optionalProps).filter(([, value]) => value !== undefined),
        )

        baseConfig.renders![renderId] = {
          id: renderId,
          title: renderConfig.title,
          assets: renderConfig.assets,
          ...cleanedProps,
        } as BaseStacRender
      }
    }

    // Add other config properties
    if (config['eodhrc:time-variable-items'] !== undefined) {
      baseConfig['eodhrc:time-variable-items'] = config['eodhrc:time-variable-items']
    }
    if (config['eodhrc:render-key-properties'] !== undefined) {
      baseConfig['eodhrc:render-key-properties'] = config['eodhrc:render-key-properties']
    }
    if (config.thumbnail_auth !== undefined) {
      baseConfig.thumbnail_auth = config.thumbnail_auth
    }
    if (config.thumbnail_asset !== undefined) {
      baseConfig.thumbnail_asset = config.thumbnail_asset
    }

    result[collectionId] = baseConfig
  }

  return result
}

export const collectionRenderingConfig: Record<string, CollectionConfig> =
  translateServerConfigToCollectionConfig(serverConfig)
