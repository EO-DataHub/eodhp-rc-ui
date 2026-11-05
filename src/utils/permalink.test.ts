import { describe, expect, it } from 'vitest'
import type { Item } from '@/types'
import {
  buildPermalinkPath,
  buildPermalinkUrl,
  buildPermalinkUrlWithLimit,
  parsePermalinkParams,
  type MapBounds,
} from './permalink'

const bounds: MapBounds = [-1, 50, 1, 52]
const item = (id: string, collection = 'sentinel-2') => ({ id, collection }) as unknown as Item

describe('buildPermalinkPath', () => {
  it('builds a path route, not a hash route', () => {
    const path = buildPermalinkPath('sentinel-2', [item('a')], bounds)
    expect(path.startsWith('/finder/sentinel-2?')).toBe(true)
    expect(path).not.toContain('#')
  })

  it('round-trips through parsePermalinkParams', () => {
    const path = buildPermalinkPath('sentinel-2', [item('a'), item('b')], bounds)
    const parsed = parsePermalinkParams(new URLSearchParams(path.split('?')[1]))
    expect(parsed.bounds).toEqual(bounds)
    expect(parsed.itemsByCollection.map((i) => i.itemId)).toEqual(['a', 'b'])
  })
})

describe('buildPermalinkUrl', () => {
  it('uses the app root, not the current page path', () => {
    window.history.replaceState(null, '', '/my-data/saved-sets')
    const url = buildPermalinkUrl('sentinel-2', [item('a')], bounds)
    // BASE_URL is '/' in tests, so the app root is the origin.
    expect(url.startsWith(`${window.location.origin}/finder/sentinel-2?`)).toBe(true)
  })

  it('drops items until the URL fits', () => {
    const items = Array.from({ length: 50 }, (_, i) => item(`item-with-a-long-id-${i}`))
    const { url, itemsIncluded } = buildPermalinkUrlWithLimit('sentinel-2', items, bounds, 400)
    expect(url.length).toBeLessThanOrEqual(400)
    expect(itemsIncluded).toBeLessThan(50)
    expect(url.startsWith(`${window.location.origin}/finder/sentinel-2?`)).toBe(true)
  })
})
