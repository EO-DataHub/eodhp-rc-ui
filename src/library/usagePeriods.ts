// Calendar periods for usage reporting. All maths is in UTC so the periods match the
// accounting API's time aggregation: weeks start on Monday and quarters start on
// 1 January, April, July and October.

export type PeriodType = 'day' | 'week' | 'month' | 'quarter'

/** A half-open time range: `start` is inclusive, `end` is exclusive. */
export interface Period {
  start: Date
  end: Date
}

const startOfPeriod = (type: PeriodType, date: Date): Date => {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  switch (type) {
    case 'day':
      return new Date(Date.UTC(year, month, day))
    case 'week': {
      // getUTCDay is 0 for Sunday; count days back to the Monday.
      const daysSinceMonday = (date.getUTCDay() + 6) % 7
      return new Date(Date.UTC(year, month, day - daysSinceMonday))
    }
    case 'month':
      return new Date(Date.UTC(year, month, 1))
    case 'quarter':
      return new Date(Date.UTC(year, month - (month % 3), 1))
  }
}

const addPeriods = (type: PeriodType, start: Date, count: number): Date => {
  const year = start.getUTCFullYear()
  const month = start.getUTCMonth()
  const day = start.getUTCDate()
  switch (type) {
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

/** The period of this type that contains `date`. */
export const getPeriodBounds = (type: PeriodType, date: Date): Period => {
  const start = startOfPeriod(type, date)
  return { start, end: addPeriods(type, start, 1) }
}

/** The period of this type that ends where `period` starts. */
export const getPreviousPeriod = (type: PeriodType, period: Period): Period => {
  const start = addPeriods(type, startOfPeriod(type, period.start), -1)
  return { start, end: addPeriods(type, start, 1) }
}

/** The latest period of this type that has fully ended at `now`. */
export const getLastCompletePeriod = (type: PeriodType, now: Date): Period =>
  getPreviousPeriod(type, getPeriodBounds(type, now))

/** Whether `now` falls inside the period. */
export const isPeriodInProgress = (period: Period, now: Date): boolean =>
  period.start.getTime() <= now.getTime() && now.getTime() < period.end.getTime()
