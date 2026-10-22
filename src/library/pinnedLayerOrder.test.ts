import { describe, expect, test } from 'vitest'
import { getPinnedLayerMoves, movePinnedItem, PINNED_LAYERS_ANCHOR_ID } from './pinnedLayerOrder'

const items = ['a', 'b', 'c', 'd'].map((pinId) => ({ pinId }))
const ids = (list: { pinId?: string }[]) => list.map((item) => item.pinId)

describe('movePinnedItem', () => {
  test('moves an item up to the position of another', () => {
    expect(ids(movePinnedItem(items, 'a', 'c'))).toEqual(['b', 'c', 'a', 'd'])
  })

  test('moves an item down to the position of another', () => {
    expect(ids(movePinnedItem(items, 'd', 'b'))).toEqual(['a', 'd', 'b', 'c'])
  })

  test('gives the same order when applied to the reversed list', () => {
    const reversed = [...items].reverse()
    expect(ids(movePinnedItem(reversed, 'a', 'c').reverse())).toEqual(
      ids(movePinnedItem(items, 'a', 'c')),
    )
  })

  test('returns the list unchanged for unknown or identical ids', () => {
    expect(movePinnedItem(items, 'a', 'missing')).toBe(items)
    expect(movePinnedItem(items, 'b', 'b')).toBe(items)
  })
})

describe('getPinnedLayerMoves', () => {
  const anchor = PINNED_LAYERS_ANCHOR_ID

  test('returns no moves when the pinned layers sit in order directly under the anchor', () => {
    expect(
      getPinnedLayerMoves(['base', 'a', 'b', 'c', anchor, 'footprints'], ['a', 'b', 'c']),
    ).toEqual([])
  })

  test('moves every pinned layer under the anchor, bottom first', () => {
    expect(getPinnedLayerMoves(['base', 'c', 'a', 'b', anchor], ['a', 'b', 'c'])).toEqual([
      ['a', anchor],
      ['b', anchor],
      ['c', anchor],
    ])
  })

  test('pulls a newly added layer back down from above the overlays', () => {
    expect(
      getPinnedLayerMoves(
        ['base', 'a', 'b', anchor, 'footprints', 'drawn-area', 'c'],
        ['a', 'b', 'c'],
      ),
    ).toEqual([
      ['a', anchor],
      ['b', anchor],
      ['c', anchor],
    ])
  })

  test('moves layers that are in order but not directly under the anchor', () => {
    expect(getPinnedLayerMoves(['base', 'a', 'footprints', 'b', anchor], ['a', 'b'])).toEqual([
      ['a', anchor],
      ['b', anchor],
    ])
  })

  test('ignores pinned layers that are not on the map yet', () => {
    expect(getPinnedLayerMoves(['base', 'a', 'c', anchor], ['a', 'b', 'c'])).toEqual([])
  })

  test('waits for the anchor before moving anything', () => {
    expect(getPinnedLayerMoves(['base', 'c', 'a'], ['a', 'b', 'c'])).toEqual([])
  })
})
