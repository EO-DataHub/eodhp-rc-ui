import { describe, expect, it } from 'vitest'
import {
  formatPeriodLabel,
  fromDateParam,
  getPeriodEnd,
  getPeriodStart,
  isPeriodInProgress,
  shiftPeriod,
  toDateParam,
} from './usagePeriods'

const utc = (value: string) => new Date(`${value}T00:00:00Z`)

describe('getPeriodStart', () => {
  // Thursday 22 October 2026, late in the UTC day.
  const date = new Date('2026-10-22T23:30:00Z')

  it('truncates to the UTC day', () => {
    expect(getPeriodStart(date, 'day')).toEqual(utc('2026-10-22'))
  })

  it('starts a week on Monday', () => {
    expect(getPeriodStart(date, 'week')).toEqual(utc('2026-10-19'))
    expect(getPeriodStart(utc('2026-10-19'), 'week')).toEqual(utc('2026-10-19'))
    // A Sunday belongs to the week that started the Monday before.
    expect(getPeriodStart(utc('2026-10-25'), 'week')).toEqual(utc('2026-10-19'))
  })

  it('truncates to the month and the calendar quarter', () => {
    expect(getPeriodStart(date, 'month')).toEqual(utc('2026-10-01'))
    expect(getPeriodStart(date, 'quarter')).toEqual(utc('2026-10-01'))
    expect(getPeriodStart(utc('2026-06-30'), 'quarter')).toEqual(utc('2026-04-01'))
  })
})

describe('shiftPeriod', () => {
  it('moves across month and year boundaries', () => {
    expect(shiftPeriod(utc('2026-12-31'), 'day', 1)).toEqual(utc('2027-01-01'))
    expect(shiftPeriod(utc('2026-12-28'), 'week', 1)).toEqual(utc('2027-01-04'))
    expect(shiftPeriod(utc('2026-01-01'), 'month', -1)).toEqual(utc('2025-12-01'))
    expect(shiftPeriod(utc('2026-01-01'), 'quarter', -1)).toEqual(utc('2025-10-01'))
  })

  it('gives the exclusive end of a period', () => {
    expect(getPeriodEnd(utc('2026-02-01'), 'month')).toEqual(utc('2026-03-01'))
  })
})

describe('isPeriodInProgress', () => {
  const now = new Date('2026-10-22T12:00:00Z')

  it('is true only for the period containing now', () => {
    expect(isPeriodInProgress(utc('2026-10-01'), 'month', now)).toBe(true)
    expect(isPeriodInProgress(utc('2026-09-01'), 'month', now)).toBe(false)
    expect(isPeriodInProgress(utc('2026-10-22'), 'day', now)).toBe(true)
    expect(isPeriodInProgress(utc('2026-10-21'), 'day', now)).toBe(false)
  })
})

describe('formatPeriodLabel', () => {
  it('names a quarter by number', () => {
    expect(formatPeriodLabel(utc('2026-10-01'), 'quarter')).toBe('Q4 2026')
  })

  it('labels a week by its Monday', () => {
    expect(formatPeriodLabel(utc('2026-10-19'), 'week')).toMatch(/^Week of /)
  })
})

describe('date params', () => {
  it('round-trips a date', () => {
    expect(toDateParam(utc('2026-10-19'))).toBe('2026-10-19')
    expect(fromDateParam('2026-10-19')).toEqual(utc('2026-10-19'))
  })

  it('rejects malformed and impossible dates', () => {
    expect(fromDateParam(null)).toBeNull()
    expect(fromDateParam('2026-10')).toBeNull()
    expect(fromDateParam('2026-02-31')).toBeNull()
  })
})
