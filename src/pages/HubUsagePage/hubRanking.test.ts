import { describe, expect, it } from 'vitest'
import { parseCredits, quantityScale } from './hubRanking'

describe('Stage 6: parseCredits on very large numbers', () => {
  it.each(['1e21', '-1e21', '1e300'])('returns no value for %s instead of throwing', (value) => {
    expect(() => parseCredits(value)).not.toThrow()
    expect(parseCredits(value)).toBeUndefined()
  })

  it('still parses a number in exponent form below 1e21', () => {
    expect(parseCredits('1.5e2')).toBe(150_000_000_000n)
  })
})

describe('quantityScale: readable units for large second counts', () => {
  it('keeps seconds below an hour', () => {
    expect(quantityScale(3000, 'cpu-seconds')).toEqual({ divisor: 1, unit: 'cpu-seconds' })
  })

  it('switches seconds to hours from an hour up', () => {
    expect(quantityScale(3600, 'cpu-seconds')).toEqual({ divisor: 3600, unit: 'cpu-hours' })
    expect(quantityScale(606960, 'memory-gb-seconds')).toEqual({
      divisor: 3600,
      unit: 'memory-gb-hours',
    })
  })

  it.each([
    ['GB-s', 'GB-h'],
    ['s', 'h'],
    ['cpu-sec', 'cpu-hr'],
    ['GB secs', 'GB hrs'],
    ['second', 'hour'],
  ])('switches the short unit %s to %s', (unit, hours) => {
    expect(quantityScale(7200, unit)).toEqual({ divisor: 3600, unit: hours })
  })

  it('does not treat units that only end in s as seconds', () => {
    expect(quantityScale(7200, 'requests')).toEqual({ divisor: 1, unit: 'requests' })
    expect(quantityScale(7200, 'GB-hours')).toEqual({ divisor: 1, unit: 'GB-hours' })
  })

  it('uses the size of a negative quantity', () => {
    expect(quantityScale(-7200, 'cpu-seconds').divisor).toBe(3600)
  })

  it('leaves other units alone', () => {
    expect(quantityScale(1e6, 'GB-hours')).toEqual({ divisor: 1, unit: 'GB-hours' })
    expect(quantityScale(1e6, '')).toEqual({ divisor: 1, unit: '' })
  })
})
