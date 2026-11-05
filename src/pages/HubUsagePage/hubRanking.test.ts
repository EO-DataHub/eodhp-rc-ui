import { describe, expect, it } from 'vitest'
import { parseCredits } from './hubRanking'

describe('Stage 6: parseCredits on very large numbers', () => {
  it.each(['1e21', '-1e21', '1e300'])('returns no value for %s instead of throwing', (value) => {
    expect(() => parseCredits(value)).not.toThrow()
    expect(parseCredits(value)).toBeUndefined()
  })

  it('still parses a number in exponent form below 1e21', () => {
    expect(parseCredits('1.5e2')).toBe(150_000_000_000n)
  })
})
