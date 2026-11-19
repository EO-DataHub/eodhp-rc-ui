import { describe, expect, test } from 'vitest'
import { isListedCollection } from './collectionRenderingConfig'

describe('isListedCollection', () => {
  const config = {
    shown: { renders: {} },
    hidden: { renders: {}, 'eodhrc:unlisted': true },
  }

  test('lists a configured collection unless it is marked unlisted', () => {
    expect(isListedCollection('shown', config)).toBe(true)
    expect(isListedCollection('hidden', config)).toBe(false)
  })

  test('lists a collection that has no configuration', () => {
    expect(isListedCollection('not-configured', config)).toBe(true)
  })

  test('keeps Landsat off the gallery until users are told it is requester-pays', () => {
    expect(isListedCollection('landsat-c2-l2')).toBe(false)
    expect(isListedCollection('sentinel-2-c1-l2a')).toBe(true)
  })
})
