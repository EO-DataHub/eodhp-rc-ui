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

export const DATASETS = {
  SENTINEL_2: 'sentinel2_ard',
  SENTINEL_1: 'sentinel1',
  AIRBUS_SAR: 'airbus_sar_data',
  AIRBUS_PHR: 'airbus_phr_data',
  AIRBUS_SPOT: 'airbus_spot_data',
  LAND_COVER: 'land_cover',
  EOCIS_SST_CLIM: 'eocis-sst-cdrv3-climatology',
  EOCIS_SST: 'eocis-sst-cdrv3',
  EOCIS_LST_S3A_DAY: 'eocis-lst-s3a-day',
  EOCIS_LST_S3A_NIGHT: 'eocis-lst-s3a-night',
  EOCIS_LST_S3B_DAY: 'eocis-lst-s3b-day',
  EOCIS_LST_S3B_NIGHT: 'eocis-lst-s3b-night',
  EOCIS_AEROSOL_S3A_DAILY: 'eocis-aerosol-slstr-daily-s3a',
  EOCIS_AEROSOL_S3B_DAILY: 'eocis-aerosol-slstr-daily-s3b',
  EOCIS_AEROSOL_S3A_MONTHLY: 'eocis-aerosol-slstr-monthly-s3a',
  EOCIS_AEROSOL_S3B_MONTHLY: 'eocis-aerosol-slstr-monthly-s3b',
} as const

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

export const collectionRenderingConfig: Record<string, CollectionConfig> = {
  [DATASETS.SENTINEL_2]: {
    rendererType: 'titiler',
    renders: {
      'True Color': {
        assets: 'cog',
        title: 'True Color',
        bidx: [3, 2, 1],
        rescale: [
          [0, 200],
          [0, 200],
          [0, 200],
        ],
      },
      'False Color': {
        assets: 'cog',
        title: 'False Color',
        bidx: [8, 4, 3],
        rescale: [
          [0, 200],
          [0, 200],
          [0, 200],
        ],
      },
      SWIR: {
        assets: 'cog',
        title: 'SWIR',
        bidx: [12, 8, 4],
        rescale: [
          [0, 200],
          [0, 200],
          [0, 200],
        ],
      },
    },
  },
  [DATASETS.SENTINEL_1]: {
    rendererType: 'thumbnail',
  },
  [DATASETS.AIRBUS_SAR]: {
    rendererType: 'titiler',
    renders: {
      default: {
        assets: 'thumbnail',
        title: 'Thumbnail',
      },
    },
  },
  [DATASETS.LAND_COVER]: {
    rendererType: 'titiler',
    renders: {
      default: {
        title: 'GeoTIFF',
        assets: 'GeoTIFF',
        colormap_name: 'tab20c',
      },
    },
  },
  [DATASETS.EOCIS_SST_CLIM]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[0, 1]],
        colormap_name: 'blues',
        variable: 'sea_ice_fraction',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_SST]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[263.15, 310.15]],
        colormap_name: 'jet',
        variable: 'analysed_sst',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_LST_S3A_DAY]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[263.15, 318.15]],
        colormap_name: 'jet',
        variable: 'lst',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_LST_S3A_NIGHT]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[263.15, 318.15]],
        colormap_name: 'jet',
        variable: 'lst',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_LST_S3B_DAY]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[263.15, 318.15]],
        colormap_name: 'jet',
        variable: 'lst',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_LST_S3B_NIGHT]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[263.15, 318.15]],
        colormap_name: 'jet',
        variable: 'lst',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_AEROSOL_S3A_DAILY]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[0, 1]],
        colormap_name: 'plasma',
        variable: 'AOD550_mean',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_AEROSOL_S3B_DAILY]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[0, 1]],
        colormap_name: 'plasma',
        variable: 'AOD550_mean',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_AEROSOL_S3A_MONTHLY]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[0, 1]],
        colormap_name: 'plasma',
        variable: 'AOD550_mean',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.EOCIS_AEROSOL_S3B_MONTHLY]: {
    rendererType: 'titiler-xarray',
    assetKey: 'reference_file',
    renders: {
      default: {
        title: 'Default Visualization',
        assets: 'reference_file',
        rescale: [[0, 1]],
        colormap_name: 'plasma',
        variable: 'AOD550_mean',
        tileMatrixSetId: 'WebMercatorQuad',
        scale: 1,
        multiscale: false,
        reference: true,
        decode_times: true,
        consolidated: false,
        return_mask: true,
      },
    },
  },
  [DATASETS.AIRBUS_PHR]: {
    rendererType: 'thumbnail',
  },
  [DATASETS.AIRBUS_SPOT]: {
    rendererType: 'thumbnail',
  },
}
