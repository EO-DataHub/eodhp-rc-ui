import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type Bbox,
  type CogInfo,
  buildAoiSubsetUrl,
  estimateSubsetBytes,
  formatBytes,
  getAoiSubsetFilename,
  getAoiSubsetStatus,
  intersectBbox,
  isSubsettableAsset,
} from './aoiSubset'
import { bboxToPolygon } from './geoUtils'

const MB = 1024 * 1024

// Modelled on a sentinel2_ard `cog` asset: 10-band uint16, ~1.3 GB, EPSG:27700
const s2Info: CogInfo = {
  bbox: [-3.0, 60.3, -1.0, 61.3],
  crs: 'http://www.opengis.net/def/crs/EPSG/0/27700',
  dtype: 'uint16',
  count: 10,
  width: 11136,
  height: 11140,
  nodata: 0,
}

const aoiFeature = (bbox: Bbox): GeoJSON.Feature => ({
  type: 'Feature',
  properties: {},
  geometry: bboxToPolygon(bbox),
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isSubsettableAsset', () => {
  it('accepts GeoTIFF data assets, with or without a COG profile', () => {
    expect(
      isSubsettableAsset({
        href: 'a.tif',
        type: 'image/tiff; application=geotiff',
        roles: ['data'],
      }),
    ).toBe(true)
    expect(
      isSubsettableAsset({
        href: 'a.tif',
        type: 'image/tiff; application=geotiff; profile=cloud-optimized',
      }),
    ).toBe(true)
  })

  it('rejects non-TIFF, untyped and preview assets', () => {
    expect(isSubsettableAsset({ href: 'a.jpg', type: 'image/jpeg', roles: ['data'] })).toBe(false)
    expect(isSubsettableAsset({ href: 'a.tif', roles: ['data'] })).toBe(false)
    expect(isSubsettableAsset({ href: 'a.tif', type: 'image/tiff', roles: ['thumbnail'] })).toBe(
      false,
    )
    expect(isSubsettableAsset({ href: 'a.tif', type: 'image/tiff', roles: ['metadata'] })).toBe(
      false,
    )
  })
})

describe('intersectBbox', () => {
  it('returns the overlap', () => {
    expect(intersectBbox([0, 0, 10, 10], [5, 5, 15, 15])).toEqual([5, 5, 10, 10])
  })

  it('returns null when the boxes only touch or are apart', () => {
    expect(intersectBbox([0, 0, 10, 10], [10, 0, 20, 10])).toBeNull()
    expect(intersectBbox([0, 0, 1, 1], [5, 5, 6, 6])).toBeNull()
  })
})

describe('estimateSubsetBytes', () => {
  it('scales the full file size by the area fraction', () => {
    const full = 11136 * 11140 * 10 * 2
    expect(estimateSubsetBytes(s2Info, s2Info.bbox)).toBe(full)
    expect(estimateSubsetBytes(s2Info, [-3.0, 60.3, -2.0, 60.8])).toBe(Math.round(full / 4))
  })

  it('uses the dtype size', () => {
    const uint8 = { ...s2Info, dtype: 'uint8', count: 1 }
    expect(estimateSubsetBytes(uint8, uint8.bbox)).toBe(11136 * 11140)
  })
})

describe('buildAoiSubsetUrl', () => {
  it('builds a native-CRS titiler bbox URL without a mask band', () => {
    vi.stubEnv('VITE_TITILER_BASE_URL', 'https://eodatahub.org.uk/titiler/')
    const url = buildAoiSubsetUrl({
      href: 'https://dap.ceda.ac.uk/a b.tif',
      bbox: [-1.3, 60.45, -1.2, 60.5],
      dstCrs: s2Info.crs,
      filename: 'item_cog_aoi.tif',
    })
    const [path, query] = url.split('?')
    expect(path).toBe('https://eodatahub.org.uk/titiler/core/cog/bbox/-1.3,60.45,-1.2,60.5.tif')
    const params = new URLSearchParams(query)
    expect(params.get('url')).toBe('https://dap.ceda.ac.uk/a b.tif')
    expect(params.get('dst_crs')).toBe(s2Info.crs)
    expect(params.get('return_mask')).toBe('false')
    expect(params.get('filename')).toBe('item_cog_aoi.tif')
  })
})

describe('getAoiSubsetFilename', () => {
  it('replaces characters that are unsafe in filenames', () => {
    expect(getAoiSubsetFilename('neodc.sentinel/2026 10', 'cog')).toBe(
      'neodc.sentinel_2026_10_cog_aoi.tif',
    )
  })
})

describe('getAoiSubsetStatus', () => {
  const base = { info: s2Info, href: 'https://x/a.tif', filename: 'f.tif' }

  it('needs an AOI', () => {
    expect(getAoiSubsetStatus({ ...base, aoi: undefined })).toEqual({ state: 'no-aoi' })
  })

  it('needs the AOI to overlap the file', () => {
    expect(getAoiSubsetStatus({ ...base, aoi: aoiFeature([10, 10, 11, 11]) })).toEqual({
      state: 'no-overlap',
    })
  })

  it('returns a link for a small AOI, clipped to the file bounds', () => {
    vi.stubEnv('VITE_TITILER_BASE_URL', 'https://t')
    const status = getAoiSubsetStatus({ ...base, aoi: aoiFeature([-3.5, 60.2, -2.9, 60.4]) })
    expect(status.state).toBe('ok')
    if (status.state !== 'ok') return
    expect(status.warn).toBe(false)
    expect(status.url).toContain('/core/cog/bbox/-3,60.3,-2.9,60.4.tif?')
  })

  it('warns above the soft limit', () => {
    vi.stubEnv('VITE_TITILER_BASE_URL', 'https://t')
    // 1/16 of a ~2.5 GB file is ~155 MB
    const status = getAoiSubsetStatus({ ...base, aoi: aoiFeature([-3.0, 60.3, -2.5, 60.55]) })
    expect(status).toMatchObject({ state: 'ok', warn: true })
  })

  it('blocks above the hard limit, including the estimate margin', () => {
    const status = getAoiSubsetStatus({ ...base, aoi: aoiFeature([-3.0, 60.3, -2.0, 60.8]) })
    expect(status).toMatchObject({ state: 'too-large', maxBytes: 250 * MB })
  })

  it('reads the limits from env', () => {
    vi.stubEnv('VITE_TITILER_BASE_URL', 'https://t')
    vi.stubEnv('VITE_AOI_SUBSET_MAX_MB', '1000')
    const status = getAoiSubsetStatus({ ...base, aoi: aoiFeature([-3.0, 60.3, -2.0, 60.8]) })
    expect(status).toMatchObject({ state: 'ok', warn: true })
  })
})

describe('formatBytes', () => {
  it('formats KB, MB and GB', () => {
    expect(formatBytes(500)).toBe('1 KB')
    expect(formatBytes(6.9 * MB)).toBe('7 MB')
    expect(formatBytes(1.29 * 1024 * MB)).toBe('1.3 GB')
  })
})
