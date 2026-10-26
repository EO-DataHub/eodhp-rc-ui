import { describe, expect, test } from 'vitest'
import { getRangeLabel, getRangeLimit } from './rangeLabel'

describe('getRangeLimit', () => {
  test('treats >= as a minimum and <= as a maximum', () => {
    expect(getRangeLimit('>=')).toBe('min')
    expect(getRangeLimit('<=')).toBe('max')
  })

  test('returns null when there is no comparison operator', () => {
    expect(getRangeLimit(undefined)).toBeNull()
    expect(getRangeLimit('=')).toBeNull()
  })
})

describe('getRangeLabel', () => {
  test('prefixes the title and lowercases its first word', () => {
    expect(getRangeLabel('Cloud cover', 'max')).toBe('Maximum cloud cover')
    expect(getRangeLabel('Incidence angle', 'min')).toBe('Minimum incidence angle')
  })

  test('keeps a leading acronym as-is', () => {
    expect(getRangeLabel('SAR incidence angle', 'min')).toBe('Minimum SAR incidence angle')
  })

  test('lowercases a single-letter first word', () => {
    expect(getRangeLabel('X offset', 'max')).toBe('Maximum x offset')
  })

  test('leaves the title alone when there is no limit', () => {
    expect(getRangeLabel('Cloud cover', null)).toBe('Cloud cover')
  })

  test('falls back to a generic label without a title', () => {
    expect(getRangeLabel(undefined, 'max')).toBe('Select a range value')
  })
})
