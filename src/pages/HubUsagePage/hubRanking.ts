import { BillingEvent } from '@/services/accountingService'

/**
 * Credits are held as whole units of 10^-CREDIT_SCALE so that sums and differences of the
 * API's decimal strings stay exact.
 */
export type Credits = bigint

const CREDIT_SCALE = 9
const CREDIT_UNIT = 10n ** BigInt(CREDIT_SCALE)
const PLAIN_DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)$/

const roundedDivide = (value: bigint, divisor: bigint): bigint => {
  const negative = value < 0n
  const magnitude = negative ? -value : value
  const quotient = (magnitude + divisor / 2n) / divisor
  return negative ? -quotient : quotient
}

/** Parses a decimal credit string exactly, or returns undefined when it is not a number. */
export const parseCredits = (value: string | number | null | undefined): Credits | undefined => {
  if (value === null || value === undefined) return undefined
  let text = String(value).trim()
  if (!PLAIN_DECIMAL.test(text)) {
    const number = Number(text)
    if (text === '' || !Number.isFinite(number)) return undefined
    text = number.toFixed(CREDIT_SCALE)
    // toFixed falls back to exponent form for magnitudes of 1e21 and above.
    if (!PLAIN_DECIMAL.test(text)) return undefined
  }
  const negative = text.startsWith('-')
  const unsigned = text.replace(/^[+-]/, '')
  const [whole, fraction = ''] = unsigned.split('.')
  let units = BigInt(whole || '0') * CREDIT_UNIT
  if (fraction.length <= CREDIT_SCALE) {
    units += BigInt(fraction.padEnd(CREDIT_SCALE, '0') || '0')
  } else {
    const excess = 10n ** BigInt(fraction.length - CREDIT_SCALE)
    units += roundedDivide(BigInt(fraction), excess)
  }
  return negative ? -units : units
}

export interface RankingRow {
  workspace: string
  total: Credits
  share: number
  /** SKU code with the most credits in the selected period. */
  topSku: string
  /** Credit difference against the previous period, or undefined when it cost 0 credits. */
  change: Credits | undefined
  /** Current balance, or undefined when the workspace is not in the summaries. */
  balance: Credits | undefined
}

export interface Ranking {
  rows: RankingRow[]
  total: Credits
}

/**
 * Builds one row per workspace whose credits in the selected period are not 0. Events that
 * start before `periodStart` belong to the previous period and only feed the change.
 */
export const buildRanking = (
  events: BillingEvent[],
  periodStart: Date,
  balances: Map<string, Credits | undefined>,
): Ranking => {
  const startTime = periodStart.getTime()
  const current = new Map<string, Map<string, Credits>>()
  const previous = new Map<string, Credits>()

  events.forEach((event) => {
    const credits = parseCredits(event.credits)
    if (credits === undefined) return
    if (new Date(event.event_start).getTime() >= startTime) {
      const bySku = current.get(event.workspace) ?? new Map<string, Credits>()
      bySku.set(event.item, (bySku.get(event.item) ?? 0n) + credits)
      current.set(event.workspace, bySku)
    } else {
      previous.set(event.workspace, (previous.get(event.workspace) ?? 0n) + credits)
    }
  })

  const totals = [...current.entries()]
    .map(([workspace, bySku]) => {
      let total = 0n
      let topSku = ''
      let topCredits: Credits | undefined
      ;[...bySku.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([sku, credits]) => {
          total += credits
          if (topCredits === undefined || credits > topCredits) {
            topSku = sku
            topCredits = credits
          }
        })
      return { workspace, total, topSku }
    })
    // Usage that cost nothing does not rank; the workspace counts as idle.
    .filter((row) => row.total !== 0n)

  const grandTotal = totals.reduce((sum, row) => sum + row.total, 0n)
  const rows = totals.map(({ workspace, total, topSku }) => {
    const before = previous.get(workspace)
    return {
      workspace,
      total,
      share: grandTotal > 0n ? (Number(total) / Number(grandTotal)) * 100 : 0,
      topSku,
      change: before === undefined || before === 0n ? undefined : total - before,
      balance: balances.get(workspace),
    }
  })

  return { rows, total: grandTotal }
}

export type SortColumn = 'workspace' | 'total' | 'share' | 'topSku' | 'change' | 'balance'
export type SortDirection = 'ascending' | 'descending'

/** Text columns sort A to Z first; number columns sort largest first. */
export const defaultDirection = (column: SortColumn): SortDirection =>
  column === 'workspace' || column === 'topSku' ? 'ascending' : 'descending'

type SortValue = number | bigint

const numericValue = (row: RankingRow, column: SortColumn): SortValue => {
  switch (column) {
    case 'total':
      return row.total
    case 'share':
      return row.share
    // "New" counts as larger than any change, so it leads a descending sort.
    case 'change':
      return row.change ?? Number.POSITIVE_INFINITY
    case 'balance':
      return row.balance ?? Number.NEGATIVE_INFINITY
    default:
      return 0
  }
}

export const sortRanking = (
  rows: RankingRow[],
  column: SortColumn,
  direction: SortDirection,
  skuName: (sku: string) => string,
): RankingRow[] => {
  const sign = direction === 'ascending' ? 1 : -1
  return [...rows].sort((a, b) => {
    let comparison: number
    if (column === 'workspace') comparison = a.workspace.localeCompare(b.workspace)
    else if (column === 'topSku') comparison = skuName(a.topSku).localeCompare(skuName(b.topSku))
    else {
      const left = numericValue(a, column)
      const right = numericValue(b, column)
      comparison = left === right ? 0 : left < right ? -1 : 1
    }
    return comparison * sign || a.workspace.localeCompare(b.workspace)
  })
}

const groupFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const CENT_DIVISOR = 10n ** BigInt(CREDIT_SCALE - 2)

/** Rounds half away from zero to 2 decimals and returns the sign and grouped digits. */
const roundToCents = (value: Credits) => {
  const cents = roundedDivide(value, CENT_DIVISOR)
  const magnitude = cents < 0n ? -cents : cents
  const fraction = (magnitude % 100n).toString().padStart(2, '0')
  return {
    sign: cents < 0n ? -1 : cents > 0n ? 1 : 0,
    digits: `${groupFormat.format(magnitude / 100n)}.${fraction}`,
  }
}

export const formatCredits = (value: Credits) => {
  const { sign, digits } = roundToCents(value)
  return sign < 0 ? `-${digits}` : digits
}
export const formatChange = (value: Credits | undefined) => {
  if (value === undefined) return 'New'
  const { sign, digits } = roundToCents(value)
  return sign < 0 ? `-${digits}` : sign > 0 ? `+${digits}` : digits
}
export const formatShare = (value: number) => `${value.toFixed(1)}%`

export interface SkuUsageRow {
  sku: string
  credits: Credits
  quantity: number
  /** Credit difference against the previous period, or undefined when it cost 0 credits. */
  creditChange: Credits | undefined
  /** Quantity difference against the previous period, or undefined when it had no usage. */
  quantityChange: number | undefined
}

interface SkuFigures {
  credits: Credits
  quantity: number
}

/**
 * Builds one row per SKU with usage in the selected period, largest credits first. Events
 * that start before `periodStart` belong to the previous period and only feed the change.
 */
export const buildSkuUsage = (events: BillingEvent[], periodStart: Date): SkuUsageRow[] => {
  const startTime = periodStart.getTime()
  const current = new Map<string, SkuFigures>()
  const previous = new Map<string, SkuFigures>()

  events.forEach((event) => {
    const credits = parseCredits(event.credits)
    if (credits === undefined) return
    const quantity = Number.isFinite(event.quantity) ? event.quantity : 0
    const target = new Date(event.event_start).getTime() >= startTime ? current : previous
    const figures = target.get(event.item) ?? { credits: 0n, quantity: 0 }
    target.set(event.item, {
      credits: figures.credits + credits,
      quantity: figures.quantity + quantity,
    })
  })

  return [...current.entries()]
    .map(([sku, figures]) => {
      const before = previous.get(sku)
      return {
        sku,
        credits: figures.credits,
        quantity: figures.quantity,
        creditChange:
          before === undefined || before.credits === 0n
            ? undefined
            : figures.credits - before.credits,
        quantityChange: before === undefined ? undefined : figures.quantity - before.quantity,
      }
    })
    .sort((a, b) =>
      a.credits === b.credits ? a.sku.localeCompare(b.sku) : a.credits > b.credits ? -1 : 1,
    )
}

const quantityFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 })

export const formatQuantity = (value: number) => quantityFormat.format(value)
export const formatQuantityChange = (value: number | undefined) => {
  if (value === undefined) return 'New'
  const text = quantityFormat.format(Math.abs(value))
  if (text === '0') return text
  return value < 0 ? `-${text}` : `+${text}`
}
