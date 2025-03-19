import qs from 'qs'
import { Item, BaseStacRender, StacRender } from '@/types'
import serverConfig from './configFromServer.json'

const TITILER_URL = import.meta.env.VITE_TITILER_BASE_URL
const TITILER_XARRAY_URL = import.meta.env.VITE_TITILER_XARRAY_BASE_URL

type TilerType = 'titiler' | 'titiler-multidim'

const tilerUrls: Record<TilerType, string> = {
  titiler: `${TITILER_URL}/stac/tiles/WebMercatorQuad/{z}/{x}/{y}@1x`,
  'titiler-multidim': `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x`,
}

interface CollectionConfig {
  renders?: Record<string, BaseStacRender>
}

interface ServerRenderConfig {
  title: string
  assets: string[]
  bidx?: number[]
  rescale?: [number, number][]
  colormap?: Record<string, string>
  colormap_name?: string
  color_formula?: string
  expression?: string
  variable?: string
  reference?: boolean
  missing_georeference?: boolean
}

interface ServerCollectionConfig {
  renders: Record<string, ServerRenderConfig>
}

export function getItemUrl(item: Item): string | undefined {
  return item.links.find((link) => link.rel === 'self')?.href
}

function getAssetUrl(item: Item, asset: string): string | undefined {
  return item.assets?.[asset]?.href
}

export const resolveTilesUrl = (item: Item, render: StacRender | undefined): string | undefined => {
  const collectionConfig = collectionRenderingConfig[item.collection]
  if (!collectionConfig) return undefined
  if (!render) return undefined

  let tilerUrl = undefined
  let urlParam = undefined

  if (render.missing_georeference && render.missing_georeference) {
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
    const renders = config.renders

    // Create base config
    const baseConfig: CollectionConfig = {
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
        if (renderConfig.bidx) {
          translatedRender.bidx = renderConfig.bidx
        }
        if (renderConfig.rescale) {
          translatedRender.rescale = renderConfig.rescale
        }
        if (renderConfig.colormap) {
          translatedRender.colormap = renderConfig.colormap
        }
        if (renderConfig.rescale) {
          translatedRender.rescale = renderConfig.rescale
        }
        if (renderConfig.variable) {
          translatedRender.variable = renderConfig.variable
        }
        if (renderConfig.colormap_name) {
          translatedRender.colormap_name = renderConfig.colormap_name
        }
        if (renderConfig.color_formula) {
          translatedRender.color_formula = renderConfig.color_formula
        }
        if (renderConfig.rescale) {
          translatedRender.rescale = renderConfig.rescale
        }
        if (renderConfig.expression) {
          translatedRender.expression = renderConfig.expression
        }
        if (renderConfig.reference !== undefined) {
          translatedRender.reference = renderConfig.reference
        }
        if (renderConfig.missing_georeference !== undefined) {
          translatedRender.missing_georeference = renderConfig.missing_georeference
        }
        baseConfig.renders![renderId] = translatedRender
      }
    }

    // Add specific properties based on renderer type
    result[collectionId] = baseConfig
  }

  return result
}

// Type assertion to ensure serverConfig matches ServerCollectionConfig
const typedServerConfig = serverConfig as unknown as Record<string, ServerCollectionConfig>
export const collectionRenderingConfig: Record<string, CollectionConfig> =
  translateServerConfigToCollectionConfig(typedServerConfig)
