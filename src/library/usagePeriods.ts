import type { TimeAggregation } from '@/services/accountingService'

// Periods match the accounting API's: calendar ones in UTC, a week starting on Monday and a
// quarter on 1 January, April, July or October. Every Date here is the UTC midnight that
// starts a period, so all arithmetic and formatting is done in UTC too.

export const getPeriodStart = (date: Date, granularity: TimeAggregation): Date => {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  switch (granularity) {
    case 'day':
      return new Date(Date.UTC(year, month, day))
    case 'week':
      // getUTCDay() is 0 for Sunday; shift so Monday is 0.
      return new Date(Date.UTC(year, month, day - ((date.getUTCDay() + 6) % 7)))
    case 'month':
      return new Date(Date.UTC(year, month, 1))
    case 'quarter':
      return new Date(Date.UTC(year, month - (month % 3), 1))
  }
}

export const shiftPeriod = (start: Date, granularity: TimeAggregation, count: number): Date => {
  const year = start.getUTCFullYear()
  const month = start.getUTCMonth()
  const day = start.getUTCDate()
  switch (granularity) {
    case 'day':
      return new Date(Date.UTC(year, month, day + count))
    case 'week':
      return new Date(Date.UTC(year, month, day + 7 * count))
    case 'month':
      return new Date(Date.UTC(year, month + count, 1))
    case 'quarter':
      return new Date(Date.UTC(year, month + 3 * count, 1))
  }
}

export const getPeriodEnd = (start: Date, granularity: TimeAggregation): Date =>
  shiftPeriod(start, granularity, 1)

export const isPeriodInProgress = (start: Date, granularity: TimeAggregation, now = new Date()) =>
  start.getTime() <= now.getTime() && now.getTime() < getPeriodEnd(start, granularity).getTime()

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export const formatPeriodLabel = (start: Date, granularity: TimeAggregation): string => {
  switch (granularity) {
    case 'day':
      return DAY_FORMATTER.format(start)
    case 'week':
      return `Week of ${DATE_FORMATTER.format(start)}`
    case 'month':
      return MONTH_FORMATTER.format(start)
    case 'quarter':
      return `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${start.getUTCFullYear()}`
  }
}

// `YYYY-MM-DD`, the form a URL parameter and an <input type="date"> both use.
export const toDateParam = (date: Date): string => date.toISOString().slice(0, 10)

export const fromDateParam = (value: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  // Rejects dates that parse but roll over, such as 2026-02-31.
  return Number.isNaN(date.getTime()) || toDateParam(date) !== value ? null : date
}

export const TIME_AGGREGATIONS: TimeAggregation[] = ['day', 'week', 'month', 'quarter']

export const isTimeAggregation = (value: string | null): value is TimeAggregation =>
  TIME_AGGREGATIONS.includes(value as TimeAggregation)
