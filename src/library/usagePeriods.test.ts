import { describe, expect, it } from 'vitest'
import {
  getLastCompletePeriod,
  getPeriodBounds,
  getPreviousPeriod,
  isPeriodInProgress,
} from './usagePeriods'

const iso = (period: { start: Date; end: Date }) => ({
  start: period.start.toISOString(),
  end: period.end.toISOString(),
})

const utc = (value: string) => new Date(value)

describe('Stage 1: usage period maths', () => {
  describe('getPeriodBounds', () => {
    it('gives the UTC day containing the date', () => {
      expect(iso(getPeriodBounds('day', utc('2026-11-03T10:00:00Z')))).toEqual({
        start: '2026-11-03T00:00:00.000Z',
        end: '2026-11-04T00:00:00.000Z',
      })
    })

    it('starts a week on Monday', () => {
      // Wednesday 4 November 2026
      expect(iso(getPeriodBounds('week', utc('2026-11-04T15:00:00Z')))).toEqual({
        start: '2026-11-02T00:00:00.000Z',
        end: '2026-11-09T00:00:00.000Z',
      })
    })

    it('puts a Sunday in the week that started the Monday before', () => {
      expect(iso(getPeriodBounds('week', utc('2026-11-08T23:59:59Z')))).toEqual({
        start: '2026-11-02T00:00:00.000Z',
        end: '2026-11-09T00:00:00.000Z',
      })
    })

    it('puts Monday 00:00 in the week it starts', () => {
      expect(iso(getPeriodBounds('week', utc('2026-11-09T00:00:00Z')))).toEqual({
        start: '2026-11-09T00:00:00.000Z',
        end: '2026-11-16T00:00:00.000Z',
      })
    })

    it('gives the calendar month', () => {
      expect(iso(getPeriodBounds('month', utc('2026-02-10T08:00:00Z')))).toEqual({
        start: '2026-02-01T00:00:00.000Z',
        end: '2026-03-01T00:00:00.000Z',
      })
    })

    it.each([
      ['2026-02-15T12:00:00Z', '2026-01-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z'],
      ['2026-05-01T00:00:00Z', '2026-04-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'],
      ['2026-08-31T23:59:59Z', '2026-07-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'],
      ['2026-12-31T23:59:59Z', '2026-10-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'],
    ])('starts the quarter containing %s on %s', (date, start, end) => {
      expect(iso(getPeriodBounds('quarter', utc(date)))).toEqual({ start, end })
    })

    it('works in UTC whatever offset the date was written with', () => {
      // 23:30 on 31 March at UTC-2 is 01:30 on 1 April in UTC.
      const date = utc('2026-03-31T23:30:00-02:00')
      expect(iso(getPeriodBounds('day', date)).start).toBe('2026-04-01T00:00:00.000Z')
      expect(iso(getPeriodBounds('month', date)).start).toBe('2026-04-01T00:00:00.000Z')
      expect(iso(getPeriodBounds('quarter', date)).start).toBe('2026-04-01T00:00:00.000Z')
    })
  })

  describe('getPreviousPeriod', () => {
    it('steps back from March to February, not to early March', () => {
      const march = getPeriodBounds('month', utc('2026-03-31T12:00:00Z'))
      expect(iso(getPreviousPeriod('month', march))).toEqual({
        start: '2026-02-01T00:00:00.000Z',
        end: '2026-03-01T00:00:00.000Z',
      })
    })

    it('steps back from 31 March to 30 March by day', () => {
      const day = getPeriodBounds('day', utc('2026-03-31T12:00:00Z'))
      expect(iso(getPreviousPeriod('day', day))).toEqual({
        start: '2026-03-30T00:00:00.000Z',
        end: '2026-03-31T00:00:00.000Z',
      })
    })

    it('steps back from the second quarter to the first', () => {
      const q2 = getPeriodBounds('quarter', utc('2026-04-15T00:00:00Z'))
      expect(iso(getPreviousPeriod('quarter', q2))).toEqual({
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-04-01T00:00:00.000Z',
      })
    })

    it.each([
      ['day', '2026-01-01T06:00:00Z', '2025-12-31T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
      ['week', '2026-01-05T06:00:00Z', '2025-12-29T00:00:00.000Z', '2026-01-05T00:00:00.000Z'],
      ['month', '2026-01-20T06:00:00Z', '2025-12-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
      ['quarter', '2026-02-20T06:00:00Z', '2025-10-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
    ] as const)('steps a %s back across the year boundary', (type, date, start, end) => {
      expect(iso(getPreviousPeriod(type, getPeriodBounds(type, utc(date))))).toEqual({
        start,
        end,
      })
    })
  })

  describe('getLastCompletePeriod', () => {
    // Tuesday 3 November 2026
    const now = utc('2026-11-03T10:00:00Z')

    it.each([
      ['day', '2026-11-02T00:00:00.000Z', '2026-11-03T00:00:00.000Z'],
      ['week', '2026-10-26T00:00:00.000Z', '2026-11-02T00:00:00.000Z'],
      ['month', '2026-10-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'],
      ['quarter', '2026-07-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'],
    ] as const)('gives the last complete %s', (type, start, end) => {
      expect(iso(getLastCompletePeriod(type, now))).toEqual({ start, end })
    })

    it('treats a period that has just started as not complete', () => {
      expect(iso(getLastCompletePeriod('month', utc('2026-11-01T00:00:00Z')))).toEqual({
        start: '2026-10-01T00:00:00.000Z',
        end: '2026-11-01T00:00:00.000Z',
      })
      expect(iso(getLastCompletePeriod('week', utc('2026-11-02T00:00:00Z')))).toEqual({
        start: '2026-10-26T00:00:00.000Z',
        end: '2026-11-02T00:00:00.000Z',
      })
    })

    it('gives the last quarter of the previous year in January', () => {
      expect(iso(getLastCompletePeriod('quarter', utc('2027-01-10T00:00:00Z')))).toEqual({
        start: '2026-10-01T00:00:00.000Z',
        end: '2027-01-01T00:00:00.000Z',
      })
    })
  })

  describe('isPeriodInProgress', () => {
    const now = utc('2026-11-03T10:00:00Z')

    it.each(['day', 'week', 'month', 'quarter'] as const)(
      'is true for the current %s and false for the last complete one',
      (type) => {
        expect(isPeriodInProgress(getPeriodBounds(type, now), now)).toBe(true)
        expect(isPeriodInProgress(getLastCompletePeriod(type, now), now)).toBe(false)
      },
    )

    it('is true at the instant a period starts and false at the instant it ends', () => {
      const november = getPeriodBounds('month', utc('2026-11-15T00:00:00Z'))
      expect(isPeriodInProgress(november, utc('2026-11-01T00:00:00Z'))).toBe(true)
      expect(isPeriodInProgress(november, utc('2026-12-01T00:00:00Z'))).toBe(false)
    })
  })
})
