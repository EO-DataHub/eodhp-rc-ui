import { useCallback, useEffect, useMemo, useState } from 'react'
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

/** Parses YYYY-MM-DD as midnight UTC, or returns undefined if it is not a real date. */
export const parseDateParam = (value: string | null): Date | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return undefined
  // Date rolls over days that do not exist, such as 2026-02-30, so require a round trip.
  return toDateParam(date) === value ? date : undefined
}

// Longest wait between checks, so long periods stay under the setTimeout limit.
const MAX_END_WAIT_MS = 60 * 60 * 1000

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
  const periodEndTime = period.end.getTime()
  // Set when the current period ends, so the in-progress state is worked out again.
  const [checkedAt, setCheckedAt] = useState(() => Date.now())

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

  // Pin the default period in the URL, so the view does not move when a period ends.
  const hasStart = requestedStart !== undefined
  useEffect(() => {
    if (hasStart) return
    update({ type: periodType, start: toDateParam(new Date(periodStartTime)) }, true)
  }, [hasStart, periodType, periodStartTime, update])

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
    const inProgress = isPeriodInProgress(bounds, new Date(Math.max(checkedAt, Date.now())))
    return {
      period: bounds,
      previousPeriod: getPreviousPeriod(periodType, bounds),
      inProgress,
    }
  }, [periodStartTime, periodType, checkedAt])

  const { inProgress } = derived
  useEffect(() => {
    if (!inProgress) return
    const wait = Math.min(Math.max(periodEndTime - Date.now(), 0) + 1000, MAX_END_WAIT_MS)
    const timer = setTimeout(() => setCheckedAt(Date.now()), wait)
    return () => clearTimeout(timer)
  }, [inProgress, periodEndTime, checkedAt])

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
