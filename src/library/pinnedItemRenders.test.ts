import { describe, expect, test } from 'vitest'
import { PLACEHOLDER_RENDER, resolveTilesUrl } from './collectionRenderingConfig'
import { getPinnedItemId, refreshPinnedItems } from './pinnedItemRenders'
import type { Item, StacRender } from '@/types'

const STALE_TILES_URL = 'https://titiler.example/stac/tiles/WebMercatorQuad/6/33/22@1x?id=default'

function pinned(collection: string, render: StacRender, extra: Partial<Item> = {}): Item {
  const item = {
    id: `${collection}-item`,
    collection,
    bbox: [0, 0, 1, 1],
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: {},
    assets: {},
    links: [{ rel: 'self', href: `https://stac.example/collections/${collection}/items/x` }],
    isUserCollection: false,
    render,
    tilesUrl: STALE_TILES_URL,
    ...extra,
  } as unknown as Item
  return { ...item, pinId: getPinnedItemId(item, render) }
}

describe('resolveTilesUrl', () => {
  test('gives no tiles for a render without assets', () => {
    expect(resolveTilesUrl(pinned('landsat-c2-l2', PLACEHOLDER_RENDER), PLACEHOLDER_RENDER)).toBe(
      undefined,
    )
  })
})

describe('refreshPinnedItems', () => {
  test('replaces a placeholder render saved before the collection had renders', () => {
    const [item] = refreshPinnedItems([pinned('landsat-c2-l2', PLACEHOLDER_RENDER)])
    expect(item.render?.id).toBe('preview')
    expect(item.render?.quicklook_georeference).toBe('proj')
    expect(item.pinId).toBe('landsat-c2-l2-item-preview')
    // A quicklook draws no tiles, so the stale TiTiler URL goes.
    expect(item.tilesUrl).toBe('')
  })

  test('keeps the placeholder, with no tiles, for a collection that still has no renders', () => {
    const [item] = refreshPinnedItems([pinned('not-configured', PLACEHOLDER_RENDER)])
    expect(item.render).toEqual(PLACEHOLDER_RENDER)
    expect(item.tilesUrl).toBe('')
  })

  test('keeps a render that still exists, with its current definition', () => {
    const saved = { id: 'Color infrared', title: 'Old title', assets: ['old'] }
    const [item] = refreshPinnedItems([pinned('sentinel-2-c1-l2a', saved)])
    expect(item.render?.id).toBe('Color infrared')
    expect(item.render?.assets).not.toEqual(['old'])
    expect(item.pinId).toBe('sentinel-2-c1-l2a-item-Color infrared')
    expect(item.tilesUrl).toContain('id=Color%20infrared')
  })

  test('uses the renders of the saved collection, not only the configuration', () => {
    const own = { id: 'own', title: 'Own render', assets: ['visual'] }
    const collectionRef = {
      id: 'not-configured',
      renders: { own },
    } as unknown as Item['collectionRef']
    const [item] = refreshPinnedItems([pinned('not-configured', own, { collectionRef })])
    expect(item.render?.id).toBe('own')
  })

  test('keeps only the first of two pins that end up with the same render', () => {
    const items = refreshPinnedItems([
      pinned('landsat-c2-l2', PLACEHOLDER_RENDER),
      pinned('landsat-c2-l2', { ...PLACEHOLDER_RENDER, id: 'gone' }),
    ])
    expect(items).toHaveLength(1)
  })
})
