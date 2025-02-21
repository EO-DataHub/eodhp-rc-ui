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

export const collectionRenderingConfig: Record<
  string,
  {
    assetKey: string
    tilesUrlTemplate: string
  }
> = {
  sentinel2_ard: {
    assetKey: 'cog',
    tilesUrlTemplate: `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url={assetUrl}&bidx=3&bidx=2&bidx=1&rescale=0,200`,
  },
  airbus_sar_data: {
    assetKey: 'thumbnail',
    tilesUrlTemplate: `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url={assetUrl}`,
  },
  land_cover: {
    assetKey: 'GeoTIFF',
    tilesUrlTemplate: `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url={assetUrl}&colormap_name=tab20c`,
  },
  eocis_sst_cdrv3_climatology: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=0,1&colormap_name=blues&variable=sea_ice_fraction&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
  eocis_sst_cdrv3: {
    assetKey: 'reference_file',
    tilesUrlTemplate: `${TITILER_XARRAY_URL}/tiles/{z}/{x}/{y}@1x?url={assetUrl}&rescale=263.15,310.15&colormap_name=jet&variable=analysed_sst&tileMatrixSetId=WebMercatorQuad&scale=1&multiscale=false&reference=true&decode_times=true&consolidated=false&return_mask=true`,
  },
}
