import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Item } from '@/types'
import {
  findPinnedEntry,
  getItemSelfHref,
  mapWithConcurrency,
  openSetMessage,
  toSavedSetItemInputs,
} from './savedSetItems'
import type { SavedSetItem } from '@/services/savedSetsService'

// setupTests.ts stubs URL for object URLs; these helpers need the real one.
beforeAll(() => {
  vi.unstubAllGlobals()
})

const item = (overrides: Partial<Item> = {}): Item =>
  ({
    id: 'S2A_20250601',
    collection: 'sentinel2_ard',
    links: [{ rel: 'self', type: 'application/json', href: 'https://hub.example/items/S2A' }],
    ...overrides,
  }) as Item

describe('getItemSelfHref', () => {
  it('uses the self link', () => {
    expect(getItemSelfHref(item())).toBe('https://hub.example/items/S2A')
  })

  it('builds the URL from the collection link when there is no self link', () => {
    const href = getItemSelfHref(
      item({
        id: 'a/b',
        links: [{ rel: 'collection', type: 'application/json', href: 'https://hub.example/c/' }],
      }),
    )
    expect(href).toBe('https://hub.example/c/items/a%2Fb')
  })
})

describe('toSavedSetItemInputs', () => {
  it('keeps render and map state, and counts items with no URL', () => {
    const { inputs, skipped } = toSavedSetItemInputs([
      item({
        render: { id: 'true-colour', title: 'True colour', assets: [] },
        mapRender: { visible: false, opacity: 0.5 },
      }),
      item({ links: [] }),
    ])
    expect(skipped).toBe(1)
    expect(inputs).toEqual([
      {
        collectionId: 'sentinel2_ard',
        itemId: 'S2A_20250601',
        selfHref: 'https://hub.example/items/S2A',
        display: { renderId: 'true-colour', visible: false, opacity: 0.5, isUserCollection: false },
      },
    ])
  })

  it('saves an item pinned with several renders once, with the first render', () => {
    const { inputs, merged } = toSavedSetItemInputs([
      item({ render: { id: 'true-colour', title: 'True colour', assets: [] } }),
      item({ render: { id: 'ndvi', title: 'NDVI', assets: [] } }),
    ])
    expect(merged).toBe(1)
    expect(inputs).toHaveLength(1)
    expect(inputs[0].display?.renderId).toBe('true-colour')
  })
})

describe('mapWithConcurrency', () => {
  it('keeps order, settles failures and limits calls in flight', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
      if (n === 3) throw new Error('nope')
      return n * 10
    })
    expect(maxInFlight).toBe(2)
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : 'failed'))).toEqual([
      10,
      20,
      'failed',
      40,
      50,
    ])
  })
})

describe('findPinnedEntry', () => {
  const entry = (renderId?: string): SavedSetItem => ({
    id: 'e1',
    collectionId: 'sentinel2_ard',
    itemId: 'S2A_20250601',
    selfHref: 'https://hub.example/items/S2A',
    display: renderId ? { renderId } : {},
    position: 0,
    addedAt: '2026-11-02T00:00:00Z',
  })
  const pinned = (renderId: string) => item({ render: { id: renderId } } as Partial<Item>)

  it('finds an item pinned with the same render', () => {
    expect(findPinnedEntry(entry('true-color'), [pinned('true-color')])).toBeDefined()
  })

  it('ignores the same item pinned with another render', () => {
    expect(findPinnedEntry(entry('true-color'), [pinned('ndvi')])).toBeUndefined()
  })

  it('does not match an entry without a render', () => {
    expect(findPinnedEntry(entry(), [pinned('true-color')])).toBeUndefined()
  })
})

describe('openSetMessage', () => {
  const counts = { total: 11, newlyPinned: 0, alreadyPinned: 0, failed: 0 }

  it('reports what was pinned and what was already pinned', () => {
    expect(openSetMessage('Glastonbury', { ...counts, newlyPinned: 8, alreadyPinned: 3 })).toEqual({
      level: 'success',
      text: "Pinned 8 items from 'Glastonbury' (3 already pinned)",
    })
  })

  it('says when everything was already pinned', () => {
    expect(openSetMessage('Glastonbury', { ...counts, alreadyPinned: 11 }).text).toBe(
      'All 11 items are already pinned',
    )
  })

  it('names a single item', () => {
    expect(
      openSetMessage('One', {
        total: 1,
        newlyPinned: 1,
        alreadyPinned: 0,
        failed: 0,
        singleItemId: 'S2A',
      }).text,
    ).toBe("Pinned S2A from 'One'")
  })

  it('reports failures next to what was pinned', () => {
    expect(openSetMessage('Glastonbury', { ...counts, newlyPinned: 9, failed: 2 })).toEqual({
      level: 'warning',
      text: "Pinned 9 items from 'Glastonbury'. 2 of 11 items couldn't be loaded. Try again. They may have been deleted, or you may not have access to them.",
    })
  })

  it('is an error when nothing could be shown', () => {
    expect(openSetMessage('Glastonbury', { ...counts, failed: 11 }).level).toBe('error')
  })
})
