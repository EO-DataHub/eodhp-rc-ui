import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getLastCompletePeriod,
  getPeriodBounds,
  getPreviousPeriod,
  isPeriodInProgress,
  Period,
  PeriodType,
} from '@/library/usagePeriods'

const PERIOD_TYPES: PeriodType[] = ['day', 'week', 'month', 'quarter']
const DEFAULT_TYPE: PeriodType = 'month'

/** Formats a UTC date as YYYY-MM-DD. */
export const toDateParam = (date: Date): string => date.toISOString().slice(0, 10)

/** Parses YYYY-MM-DD as midnight UTC, or returns undefined. */
export const parseDateParam = (value: string | null): Date | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const parseType = (value: string | null): PeriodType =>
  PERIOD_TYPES.includes(value as PeriodType) ? (value as PeriodType) : DEFAULT_TYPE

/** The period of this type containing `date`, but never later than the current period. */
const clampedPeriod = (type: PeriodType, date: Date, now: Date): Period => {
  const current = getPeriodBounds(type, now)
  return date.getTime() >= current.start.getTime() ? current : getPeriodBounds(type, date)
}

export interface HubUsageState {
  periodType: PeriodType
  period: Period
  previousPeriod: Period
  inProgress: boolean
  sku: string
  name: string
}

export interface HubUsageActions {
  setPeriodType: (type: PeriodType) => void
  stepPeriod: (direction: -1 | 1) => void
  selectDate: (date: Date) => void
  setSku: (sku: string) => void
  setName: (name: string) => void
}

// The ranking and the drill-down keep the period type, period start, SKU filter and name
// filter in the query string, so a URL restores the view and the back link keeps it.
export const useHubUsageSearchParams = (): HubUsageState & HubUsageActions => {
  const [searchParams, setSearchParams] = useSearchParams()
  const now = new Date()

  const periodType = parseType(searchParams.get('type'))
  const requestedStart = parseDateParam(searchParams.get('start'))
  const period = requestedStart
    ? clampedPeriod(periodType, requestedStart, now)
    : getLastCompletePeriod(periodType, now)
  const sku = searchParams.get('sku') ?? ''
  const name = searchParams.get('name') ?? ''
  const periodStartTime = period.start.getTime()

  const update = useCallback(
    (changes: Record<string, string | undefined>, replace = false) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          Object.entries(changes).forEach(([key, value]) => {
            if (value) next.set(key, value)
            else next.delete(key)
          })
          return next
        },
        { replace },
      )
    },
    [setSearchParams],
  )

  const setPeriodType = useCallback(
    (type: PeriodType) => {
      const last = getLastCompletePeriod(type, new Date())
      update({ type, start: toDateParam(last.start) })
    },
    [update],
  )

  const stepPeriod = useCallback(
    (direction: -1 | 1) => {
      const start = new Date(periodStartTime)
      const target =
        direction === -1
          ? getPreviousPeriod(periodType, getPeriodBounds(periodType, start))
          : clampedPeriod(periodType, getPeriodBounds(periodType, start).end, new Date())
      update({ type: periodType, start: toDateParam(target.start) })
    },
    [periodStartTime, periodType, update],
  )

  const selectDate = useCallback(
    (date: Date) => {
      const target = clampedPeriod(periodType, date, new Date())
      update({ type: periodType, start: toDateParam(target.start) })
    },
    [periodType, update],
  )

  const setSku = useCallback((value: string) => update({ sku: value }), [update])
  // Typing replaces the history entry so each keystroke is not a step back.
  const setName = useCallback((value: string) => update({ name: value }, true), [update])

  const derived = useMemo(() => {
    const bounds = getPeriodBounds(periodType, new Date(periodStartTime))
    const inProgress = isPeriodInProgress(bounds, new Date())
    return {
      period: bounds,
      previousPeriod: getPreviousPeriod(periodType, bounds),
      inProgress,
    }
  }, [periodStartTime, periodType])

  return {
    periodType,
    ...derived,
    sku,
    name,
    setPeriodType,
    stepPeriod,
    selectDate,
    setSku,
    setName,
  }
}
