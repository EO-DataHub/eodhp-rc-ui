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

const TITILER_URL = import.meta.env.VITE_TITILER_BASE_URL
const TITILER_XARRAY_URL = import.meta.env.VITE_TITILER_XARRAY_BASE_URL

export const DATASETS = {
  SENTINEL_2: 'sentinel2_ard',
  AIRBUS_SAR: 'airbus_sar_data',
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

export const collectionRenderingConfig: Record<
  string,
  { assetKey: string; tilesUrlTemplate: string }
> = {
  [DATASETS.SENTINEL_2]: {
    assetKey: 'cog',
    tilesUrlTemplate: `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url={assetUrl}&bidx=3&bidx=2&bidx=1&rescale=0,200`,    
    // Example alternative render below.  Please leave in config - can be used in demo's by uncommenting this line in local deployment until we have UI for render changes
    // tilesUrlTemplate: `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url={assetUrl}&bidx=7&bidx=3&bidx=1&rescale=0,300`,
  },
  [DATASETS.AIRBUS_SAR]: {
    assetKey: 'thumbnail',
    tilesUrlTemplate: `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url={assetUrl}`,
  },
  [DATASETS.LAND_COVER]: {
    assetKey: 'GeoTIFF',
    tilesUrlTemplate: `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url={assetUrl}&colormap_name=tab20c`,
  },
  [DATASETS.EOCIS_SST_CLIM]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=0,1&colormap_name=blues&variable=sea_ice_fraction&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
  [DATASETS.EOCIS_SST]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=263.15,310.15&colormap_name=jet&variable=analysed_sst&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
  [DATASETS.EOCIS_LST_S3A_DAY]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=263.15,318.15&colormap_name=jet&variable=lst&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
  [DATASETS.EOCIS_LST_S3A_NIGHT]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=263.15,318.15&colormap_name=jet&variable=lst&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
  [DATASETS.EOCIS_LST_S3B_DAY]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=263.15,318.15&colormap_name=jet&variable=lst&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
  [DATASETS.EOCIS_LST_S3B_NIGHT]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=263.15,318.15&colormap_name=jet&variable=lst&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
  [DATASETS.EOCIS_AEROSOL_S3A_DAILY]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=0,1&colormap_name=plasma&variable=AOD550_mean&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
  [DATASETS.EOCIS_AEROSOL_S3B_DAILY]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=0,1&colormap_name=plasma&variable=AOD550_mean&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
    [DATASETS.EOCIS_AEROSOL_S3A_MONTHLY]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=0,1&colormap_name=plasma&variable=AOD550_mean&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
    [DATASETS.EOCIS_AEROSOL_S3B_MONTHLY]: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=0,1&colormap_name=plasma&variable=AOD550_mean&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
}
