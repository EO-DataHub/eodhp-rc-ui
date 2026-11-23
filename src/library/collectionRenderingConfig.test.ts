import { describe, expect, test } from 'vitest'
import { isListedCollection, isRequesterPaysCollection } from './collectionRenderingConfig'

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
})

describe('isRequesterPaysCollection', () => {
  const config = {
    free: { renders: {} },
    paid: { renders: {}, 'eodhrc:requester-pays': true },
  }

  test('is true only for a collection marked requester-pays', () => {
    expect(isRequesterPaysCollection('free', config)).toBe(false)
    expect(isRequesterPaysCollection('paid', config)).toBe(true)
    expect(isRequesterPaysCollection('not-configured', config)).toBe(false)
  })

  test('marks Landsat as requester-pays', () => {
    expect(isRequesterPaysCollection('landsat-c2-l2')).toBe(true)
    expect(isRequesterPaysCollection('sentinel-2-c1-l2a')).toBe(false)
  })
})
