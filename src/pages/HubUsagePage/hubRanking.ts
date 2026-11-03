import { BillingEvent } from '@/services/accountingService'

export interface RankingRow {
  workspace: string
  total: number
  share: number
  /** SKU code with the most credits in the selected period. */
  topSku: string
  /** Credit difference against the previous period, or undefined when it had no usage. */
  change: number | undefined
  /** Current balance, or undefined when the workspace is not in the summaries. */
  balance: number | undefined
}

export interface Ranking {
  rows: RankingRow[]
  total: number
}

/**
 * Builds one row per workspace with usage in the selected period. Events that start before
 * `periodStart` belong to the previous period and only feed the change.
 */
export const buildRanking = (
  events: BillingEvent[],
  periodStart: Date,
  balances: Map<string, number>,
): Ranking => {
  const startTime = periodStart.getTime()
  const current = new Map<string, Map<string, number>>()
  const previous = new Map<string, number>()

  events.forEach((event) => {
    const credits = Number(event.credits)
    if (!Number.isFinite(credits)) return
    if (new Date(event.event_start).getTime() >= startTime) {
      const bySku = current.get(event.workspace) ?? new Map<string, number>()
      bySku.set(event.item, (bySku.get(event.item) ?? 0) + credits)
      current.set(event.workspace, bySku)
    } else {
      previous.set(event.workspace, (previous.get(event.workspace) ?? 0) + credits)
    }
  })

  const totals = [...current.entries()].map(([workspace, bySku]) => {
    let total = 0
    let topSku = ''
    let topCredits = -Infinity
    ;[...bySku.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([sku, credits]) => {
        total += credits
        if (credits > topCredits) {
          topSku = sku
          topCredits = credits
        }
      })
    return { workspace, total, topSku }
  })

  const grandTotal = totals.reduce((sum, row) => sum + row.total, 0)
  const rows = totals.map(({ workspace, total, topSku }) => {
    const before = previous.get(workspace)
    return {
      workspace,
      total,
      share: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      topSku,
      change: before === undefined ? undefined : total - before,
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

const numericValue = (row: RankingRow, column: SortColumn): number => {
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

const creditFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const changeFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

export const formatCredits = (value: number) => creditFormat.format(value)
export const formatChange = (value: number | undefined) =>
  value === undefined ? 'New' : changeFormat.format(value)
export const formatShare = (value: number) => `${value.toFixed(1)}%`
