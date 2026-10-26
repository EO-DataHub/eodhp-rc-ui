import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { BaseStacRender, Collection, Item, StacRender } from '@/types'
import {
  collectionRenderingConfig,
  FALLBACK_RENDER,
  getCollectionRenders,
  getFallbackAsset,
  getItemRenderOptions,
  resolveItemRender,
  resolveTilesUrl,
} from './collectionRenderingConfig'

// setupTests.ts stubs URL for object URLs; these tests parse tile URLs with the real one.
beforeAll(() => {
  vi.unstubAllGlobals()
})

const ITEM_URL = 'https://example.com/stac/collections/c/items/i'

const makeItem = (
  collection: string,
  assetKeys: string[] = [],
  overrides: { properties?: Record<string, unknown>; assets?: Record<string, unknown> } = {},
): Item =>
  ({
    id: 'i',
    collection,
    links: [{ rel: 'self', href: ITEM_URL, type: 'application/geo+json' }],
    assets: {
      ...Object.fromEntries(
        assetKeys.map((key) => [key, { href: `https://example.com/assets/${key}.tif` }]),
      ),
      ...overrides.assets,
    },
    properties: overrides.properties ?? {},
  }) as unknown as Item

const makeCollection = (id: string, renders?: Record<string, BaseStacRender>): Collection =>
  ({ id, links: [], renders }) as unknown as Collection

const queryOf = (url: string | undefined) => new URL(url!).searchParams

const ndvi: StacRender = {
  id: 'ndvi',
  title: 'NDVI',
  assets: ['ndvi'],
  colormap_name: 'rdylgn',
  rescale: [[-1, 1]],
}

describe('resolveTilesUrl', () => {
  // Guards against regressions for collections configured only in configFromServer.json.
  it('builds the same tile URLs for every static render', () => {
    const urls: Record<string, string | undefined> = {}
    for (const [configKey, config] of Object.entries(collectionRenderingConfig)) {
      const isUserCollection = configKey.startsWith('my-')
      const collectionId = isUserCollection ? configKey.slice(3) : configKey
      for (const [renderId, render] of Object.entries(config.renders ?? {})) {
        const item = makeItem(collectionId, render.assets)
        urls[`${configKey}/${renderId}`] = resolveTilesUrl(item, {
          ...render,
          id: renderId,
        })?.replace(/^.*?\/(core|xarray)\//, '<titiler>/$1/')
      }
    }
    expect(urls).toMatchSnapshot()
  })

  it('builds a URL for a collection with no static config', () => {
    const query = queryOf(resolveTilesUrl(makeItem('col_job-1', ['ndvi']), ndvi))
    expect(query.get('url')).toBe(ITEM_URL)
    expect(query.getAll('assets')).toEqual(['ndvi'])
    expect(query.get('colormap_name')).toBe('rdylgn')
    expect(query.getAll('rescale')).toEqual(['-1,1'])
  })

  it('returns undefined without a render', () => {
    expect(resolveTilesUrl(makeItem('col_job-1'), undefined)).toBeUndefined()
  })

  it('uses the item render with the same key in place of the selected render', () => {
    const item = makeItem('col_job-1', ['ndvi'], {
      properties: {
        renders: { ndvi: { title: 'NDVI', assets: ['ndvi'], colormap_name: 'viridis' } },
      },
    })
    const query = queryOf(resolveTilesUrl(item, ndvi))
    expect(query.get('colormap_name')).toBe('viridis')
    // Replaced whole, so the collection's rescale is not kept
    expect(query.get('rescale')).toBeNull()
  })

  it('does not send client-side render fields to the tiler', () => {
    const query = queryOf(
      resolveTilesUrl(makeItem('col_job-1', ['ndvi']), {
        ...ndvi,
        minmax_zoom: [8, 14],
        tilematrixsets: { WebMercatorQuad: {} },
        auth: true,
      }),
    )
    for (const key of query.keys()) {
      expect(key).not.toMatch(/minmax_zoom|tilematrixsets|auth|quicklook/)
    }
  })

  describe('bidx', () => {
    const bands = [{ name: 'B02' }, { name: 'B03' }, { name: 'B04', common_name: 'red' }]

    it('passes a flat list of indexes as bidx', () => {
      const query = queryOf(
        resolveTilesUrl(makeItem('c', ['cog']), {
          id: 'rgb',
          title: 'RGB',
          assets: ['cog'],
          bidx: [3, 2, 1],
        }),
      )
      expect(query.getAll('bidx')).toEqual(['3', '2', '1'])
      expect(query.get('asset_bidx')).toBeNull()
    })

    it('converts band names to indexes from asset bands', () => {
      const item = makeItem('c', [], {
        assets: { cog: { href: 'https://example.com/cog.tif', bands } },
      })
      const query = queryOf(
        resolveTilesUrl(item, {
          id: 'rgb',
          title: 'RGB',
          assets: ['cog'],
          bidx: ['red', 'B03', 1],
        }),
      )
      expect(query.getAll('asset_bidx')).toEqual(['cog|3,2,1'])
      expect(query.get('bidx')).toBeNull()
    })

    it('reads eo:bands and raster:bands, and falls back to item properties', () => {
      const eoItem = makeItem('c', [], {
        assets: { cog: { href: 'https://example.com/cog.tif', 'eo:bands': bands } },
      })
      const propertiesItem = makeItem('c', ['cog'], { properties: { 'raster:bands': bands } })
      const render: StacRender = { id: 'r', title: 'R', assets: ['cog'], bidx: ['B04'] }
      expect(queryOf(resolveTilesUrl(eoItem, render)).get('asset_bidx')).toBe('cog|3')
      expect(queryOf(resolveTilesUrl(propertiesItem, render)).get('asset_bidx')).toBe('cog|3')
    })

    it('converts the per-asset form to one asset_bidx per asset', () => {
      const query = queryOf(
        resolveTilesUrl(makeItem('c', ['a', 'b']), {
          id: 'r',
          title: 'R',
          assets: ['a', 'b'],
          bidx: { a: [1], b: [2, 3] },
        }),
      )
      expect(query.getAll('asset_bidx')).toEqual(['a|1', 'b|2,3'])
      expect([...query.keys()].some((key) => key.startsWith('bidx'))).toBe(false)
    })

    it('passes unknown band names on unchanged', () => {
      const query = queryOf(
        resolveTilesUrl(makeItem('c', ['cog']), {
          id: 'r',
          title: 'R',
          assets: ['cog'],
          bidx: ['nir'],
        }),
      )
      expect(query.get('asset_bidx')).toBe('cog|nir')
    })
  })

  it('passes titiler-xarray slicing params to the multidim tiler', () => {
    const url = resolveTilesUrl(makeItem('c', ['zarr']), {
      id: 'tas',
      title: 'Temperature',
      assets: ['zarr'],
      variable: 'tas',
      datetime: '2020-01-01',
      sel: ['level=500', 'member=1'],
      drop_dim: 'bnds',
      bidx: [1],
    })
    expect(url).toContain('/xarray/tiles/')
    const query = queryOf(url)
    expect(query.get('url')).toBe('https://example.com/assets/zarr.tif')
    expect(query.get('variable')).toBe('tas')
    expect(query.get('datetime')).toBe('2020-01-01')
    expect(query.getAll('sel')).toEqual(['level=500', 'member=1'])
    expect(query.get('drop_dim')).toBe('bnds')
    expect(query.getAll('bidx')).toEqual(['1'])
  })

  it('encodes a single rescale pair and a colormap', () => {
    const query = queryOf(
      resolveTilesUrl(makeItem('c', ['a']), {
        id: 'r',
        title: 'R',
        assets: ['a'],
        rescale: [0, 10],
        colormap: { '1': '#ff0000' },
      }),
    )
    expect(query.getAll('rescale')).toEqual(['0,10'])
    expect(query.get('colormap')).toBe('{"1":"#ff0000"}')
  })
})

describe('getCollectionRenders', () => {
  it('returns static renders for a collection without its own renders', () => {
    expect(getCollectionRenders(makeCollection('sentinel2_ard'), false)).toEqual(
      collectionRenderingConfig.sentinel2_ard.renders,
    )
  })

  it('returns collection renders when there is no static config', () => {
    expect(getCollectionRenders(makeCollection('col_job-1', { ndvi }), true)).toEqual({ ndvi })
  })

  it('replaces static renders by key, whole', () => {
    const renders = getCollectionRenders(
      makeCollection('sentinel2_ard', {
        'Natural Color': { title: 'Mine', assets: ['cog'] },
        extra: { title: 'Extra', assets: ['cog'] },
      }),
      false,
    )
    expect(renders['Natural Color']).toEqual({ title: 'Mine', assets: ['cog'] })
    expect(renders.extra).toEqual({ title: 'Extra', assets: ['cog'] })
    expect(renders['True Color (RGB)']).toEqual(
      collectionRenderingConfig.sentinel2_ard.renders!['True Color (RGB)'],
    )
  })

  it('keeps static-only fields from static config and ignores them from STAC', () => {
    const [configKey, renderId, staticRender] = Object.entries(collectionRenderingConfig)
      .flatMap(([key, config]) =>
        Object.entries(config.renders ?? {}).map(([id, render]) => [key, id, render] as const),
      )
      .find(([, , render]) => render.quicklook_georeference && render.auth !== undefined)!
    const isUserCollection = configKey.startsWith('my-')
    const collectionId = isUserCollection ? configKey.slice(3) : configKey

    const renders = getCollectionRenders(
      makeCollection(collectionId, {
        [renderId]: { title: 'From STAC', assets: ['x'], auth: !staticRender.auth },
        other: { title: 'Other', assets: ['x'], auth: true, quicklook_georeference: 'x' },
      }),
      isUserCollection,
    )
    expect(renders[renderId]).toEqual({
      title: 'From STAC',
      assets: ['x'],
      auth: staticRender.auth,
      quicklook_georeference: staticRender.quicklook_georeference,
    })
    expect(renders.other).toEqual({ title: 'Other', assets: ['x'] })
  })
})

describe('resolveItemRender', () => {
  it('returns the selected render when the item has no render with its key', () => {
    expect(resolveItemRender(makeItem('c'), ndvi)).toBe(ndvi)
  })

  it('keeps static-only fields from the selected render', () => {
    const item = makeItem('c', [], {
      properties: { renders: { ndvi: { title: 'Item', assets: ['ndvi'], auth: false } } },
    })
    expect(resolveItemRender(item, { ...ndvi, auth: true })).toEqual({
      id: 'ndvi',
      title: 'Item',
      assets: ['ndvi'],
      auth: true,
    })
  })
})

describe('getItemRenderOptions', () => {
  it('returns item renders as options without static-only fields', () => {
    const item = makeItem('c', [], {
      properties: { renders: { ndvi: { title: 'NDVI', assets: ['ndvi'], auth: false } } },
    })
    expect(getItemRenderOptions(item)).toEqual([{ id: 'ndvi', title: 'NDVI', assets: ['ndvi'] }])
  })

  it('returns no options for an item without renders', () => {
    expect(getItemRenderOptions(makeItem('c'))).toEqual([])
  })
})

describe('fallback render', () => {
  const COG = 'image/tiff; application=geotiff; profile=cloud-optimized'
  const asset = (type: string, roles: string[] = []) => ({
    href: `https://example.com/${roles.join('-') || 'asset'}.tif`,
    type,
    roles,
  })

  it('prefers a COG data asset, then a COG, then a GeoTIFF data asset, then a GeoTIFF', () => {
    const pick = (assets: Record<string, unknown>) =>
      getFallbackAsset(makeItem('c', [], { assets }))
    expect(
      pick({
        thumbnail: asset('image/png', ['thumbnail']),
        overview: asset(COG, ['overview']),
        data: asset(COG, ['data']),
      }),
    ).toBe('data')
    expect(pick({ tiff: asset('image/tiff', ['data']), overview: asset(COG, ['overview']) })).toBe(
      'overview',
    )
    expect(pick({ a: asset('image/tiff'), b: asset('image/tiff', ['data']) })).toBe('b')
    expect(pick({ a: asset('image/tiff') })).toBe('a')
    expect(pick({ json: asset('application/json', ['data']) })).toBeUndefined()
  })

  it('draws the fallback asset with default styling', () => {
    const item = makeItem('col_job-1', [], { assets: { ndvi: asset(COG, ['data']) } })
    const query = queryOf(resolveTilesUrl(item, FALLBACK_RENDER))
    expect(query.getAll('assets')).toEqual(['ndvi'])
    expect(query.get('isFallback')).toBeNull()
  })

  it('returns no tile URL when the item has no GeoTIFF', () => {
    expect(resolveTilesUrl(makeItem('c'), FALLBACK_RENDER)).toBeUndefined()
  })

  it('uses an item render with the fallback key, as is', () => {
    const item = makeItem('c', ['a'], {
      properties: { renders: { default: { title: 'Author default', assets: ['a'] } } },
    })
    expect(queryOf(resolveTilesUrl(item, FALLBACK_RENDER)).getAll('assets')).toEqual(['a'])
  })

  it('cannot be set from STAC', () => {
    const renders = getCollectionRenders(
      makeCollection('col_job-1', { r: { title: 'R', assets: ['a'], isFallback: true } }),
      true,
    )
    expect(renders.r.isFallback).toBeUndefined()
  })
})
