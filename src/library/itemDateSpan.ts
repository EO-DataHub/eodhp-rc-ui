import type { Item } from '@/types'
import type { LaunchItem } from '@/services/workflowVariableResolvers'
import { plural } from './workflowRunInputs'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The day an item was captured, at midnight UTC. Items without a date give undefined. */
const itemDay = (item: LaunchItem): Date | undefined => {
  const properties = (item as Partial<Item>).properties
  const value = properties?.datetime ?? properties?.start_datetime
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const dayMonth = (date: Date) => `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
const fullDate = (date: Date) => `${dayMonth(date)} ${date.getUTCFullYear()}`

/**
 * The days the items were captured, for example "items from 25 May to 13 Aug 2026", or
 * "items from 1 Jun 2025" when they share a day. Undefined when no item has a date.
 */
export const itemDateSpan = (items: LaunchItem[]): string | undefined => {
  const days = items.map(itemDay).filter((day): day is Date => !!day)
  if (days.length === 0) return undefined
  const times = days.map((day) => day.getTime())
  const first = new Date(Math.min(...times))
  const last = new Date(Math.max(...times))
  const noun = items.length === 1 ? 'item' : 'items'
  if (first.getTime() === last.getTime()) return `${noun} from ${fullDate(first)}`
  const start = first.getUTCFullYear() === last.getUTCFullYear() ? dayMonth(first) : fullDate(first)
  return `${noun} from ${start} to ${fullDate(last)}`
}

/** The job count of a run with the items' dates, for example "3 jobs · items from 25 May to 13 Aug 2026". */
export const runSummaryText = (items: LaunchItem[]): string => {
  const jobs = plural(items.length, 'job')
  const span = itemDateSpan(items)
  if (span) return `${jobs} · ${span}`
  return items.length > 1 ? `${jobs} · one for each item` : jobs
}
