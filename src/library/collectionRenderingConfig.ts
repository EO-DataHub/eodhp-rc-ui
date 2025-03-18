/**
 * Temporary rendering configuration for priority datasets.
 *
 * This is an interim solution to enable the UI to display a variety of data
 * from the catalog before a more robust implementation (e.g., STAC render
 * extension) is introduced. Instead of fetching rendering options dynamically
 * from catalog records, this configuration provides predefined asset mappings
 * and rendering parameters for key collections.
 *
 * Future improvements will involve fetching render options dynamically
 * and applying standardized rendering rules.
 */

import qs from 'qs'
import { Item, BaseStacRender, StacRender } from '@/types'
import serverConfig from './configFromServer.json'

const TITILER_URL = import.meta.env.VITE_TITILER_BASE_URL
const TITILER_XARRAY_URL = import.meta.env.VITE_TITILER_XARRAY_BASE_URL

type TilerType = 'titiler' | 'titiler-xarray'
type RendererType = TilerType | 'thumbnail'

const tilerUrls: Record<TilerType, string> = {
  titiler: `${TITILER_URL}/stac/tiles/WebMercatorQuad/{z}/{x}/{y}@1x`,
  'titiler-xarray': `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x`,
}

interface BaseCollectionConfig {
  rendererType: RendererType
  renders?: Record<string, BaseStacRender>
}

interface TitilerCollectionConfig extends BaseCollectionConfig {
  rendererType: 'titiler'
}

interface TitilerXarrayCollectionConfig extends BaseCollectionConfig {
  rendererType: 'titiler-xarray'
  assetKey: string
}

interface ThumbnailCollectionConfig extends BaseCollectionConfig {
  rendererType: 'thumbnail'
}

type CollectionConfig =
  | TitilerCollectionConfig
  | TitilerXarrayCollectionConfig
  | ThumbnailCollectionConfig

interface ServerRenderConfig {
  title?: string
  assets: string | string[]
  bidx?: number[]
  rescale?: [number, number][]
  colormap?: Record<string, string>
  colormap_name?: string
  variable?: string
  reference?: boolean
}

interface ServerCollectionConfig {
  'eodhrc:type':
    | 'raster-multiband'
    | 'raster-singleband'
    | 'multidim-singlevar-items'
    | 'multidim-multivar'
    | 'thumbnail'
  'eodhrc:api'?: string
  renders: Record<string, ServerRenderConfig>
}

export function getItemUrl(item: Item): string | undefined {
  return item.links.find((link) => link.rel === 'self')?.href
}

function getAssetUrl(item: Item, asset: string): string | undefined {
  return item.assets?.[asset]?.href
}

export const resolveTilesUrl = (item: Item, render?: StacRender): string | undefined => {
  const collectionConfig = collectionRenderingConfig[item.collection]
  if (!collectionConfig) return undefined

  const { rendererType } = collectionConfig

  if (!rendererType) return undefined

  let urlParam = undefined
  let tilerUrl = undefined

  if (rendererType === 'titiler') {
    tilerUrl = tilerUrls.titiler
    urlParam = getItemUrl(item)
  } else if (rendererType === 'titiler-xarray') {
    tilerUrl = tilerUrls['titiler-xarray']
    urlParam = getAssetUrl(item, collectionConfig.assetKey)
  } else {
    return undefined
  }

  let queryParams = {
    url: urlParam,
  } as { url: string; rescale?: string[] }

  if (render) {
    queryParams = {
      ...queryParams,
      ...render,
      rescale: render.rescale ? render.rescale.map((r) => r.join(',')) : undefined,
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
    const type = config['eodhrc:type']
    const api = config['eodhrc:api']
    const renders = config.renders

    // Determine renderer type based on eodhrc:type and api
    let rendererType: RendererType
    if (type === 'thumbnail') {
      rendererType = 'thumbnail'
    } else if (api?.includes('titiler/xarray')) {
      rendererType = 'titiler-xarray'
    } else {
      rendererType = 'titiler'
    }

    // Create base config
    const baseConfig: BaseCollectionConfig = {
      rendererType,
      renders: {},
    }

    // Translate renders
    if (renders) {
      for (const [renderId, renderConfig] of Object.entries(renders)) {
        const translatedRender: BaseStacRender = {
          title: renderConfig.title ?? renderId,
          assets: renderConfig.assets,
        }

        // Add additional properties based on render type
        if (type === 'raster-multiband') {
          if (renderConfig.bidx) {
            translatedRender.bidx = renderConfig.bidx
          }
          if (renderConfig.rescale) {
            translatedRender.rescale = renderConfig.rescale
          }
        } else if (type === 'raster-singleband') {
          if (renderConfig.colormap) {
            translatedRender.colormap = renderConfig.colormap
          }
          if (renderConfig.rescale) {
            translatedRender.rescale = renderConfig.rescale
          }
        } else if (type === 'multidim-singlevar-items' || type === 'multidim-multivar') {
          if (renderConfig.variable) {
            translatedRender.variable = renderConfig.variable
          }
          if (renderConfig.colormap_name) {
            translatedRender.colormap_name = renderConfig.colormap_name
          }
          if (renderConfig.rescale) {
            translatedRender.rescale = renderConfig.rescale
          }
          if (renderConfig.reference !== undefined) {
            translatedRender.reference = renderConfig.reference
          }
        }

        baseConfig.renders![renderId] = translatedRender
      }
    }

    // Add specific properties based on renderer type
    if (rendererType === 'titiler-xarray') {
      result[collectionId] = {
        ...baseConfig,
        assetKey: 'reference_file',
      } as TitilerXarrayCollectionConfig
    } else if (rendererType === 'thumbnail') {
      result[collectionId] = baseConfig as ThumbnailCollectionConfig
    } else {
      result[collectionId] = baseConfig as TitilerCollectionConfig
    }
  }

  return result
}

// Type assertion to ensure serverConfig matches ServerCollectionConfig
const typedServerConfig = serverConfig as unknown as Record<string, ServerCollectionConfig>
export const collectionRenderingConfig: Record<string, CollectionConfig> =
  translateServerConfigToCollectionConfig(typedServerConfig)
