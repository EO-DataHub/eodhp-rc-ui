import type { BillingEvent } from '@/services/accountingService'

export interface WorkspaceUsageSummary {
  workspace: string
  credits: number
  // This workspace's fraction of the total across all workspaces, from 0 to 1.
  share: number
  // The SKU this workspace spent the most credits on.
  topSku: string | null
  // Credits in the previous period, or null when the previous period was not compared.
  previousCredits: number | null
}

export interface UsageSummary {
  totalCredits: number
  workspaces: WorkspaceUsageSummary[]
}

// Turns usage aggregated by workspace and SKU (one row per period, workspace and SKU) into one
// summary per workspace for the period starting at `periodStart`. Rows for the period starting
// at `previousPeriodStart` give each workspace's previous total. An aggregated row's
// event_start is the start of its period, so rows are matched to a period by that alone.
//
// A workspace is listed only if it has usage in the selected period: one that used nothing
// has no rows to find it by.
export const summarizeWorkspaceUsage = (
  rows: BillingEvent[],
  periodStart: Date,
  previousPeriodStart: Date | null,
): UsageSummary => {
  const creditsByWorkspaceAndSku = new Map<string, Map<string, number>>()
  const previousByWorkspace = new Map<string, number>()

  rows.forEach((row) => {
    const rowStart = new Date(row.event_start).getTime()
    const credits = Number(row.credits)

    if (rowStart === periodStart.getTime()) {
      const bySku = creditsByWorkspaceAndSku.get(row.workspace) ?? new Map<string, number>()
      bySku.set(row.item, (bySku.get(row.item) ?? 0) + credits)
      creditsByWorkspaceAndSku.set(row.workspace, bySku)
    } else if (previousPeriodStart && rowStart === previousPeriodStart.getTime()) {
      previousByWorkspace.set(
        row.workspace,
        (previousByWorkspace.get(row.workspace) ?? 0) + credits,
      )
    }
  })

  const totals = Array.from(creditsByWorkspaceAndSku.entries()).map(([workspace, bySku]) => {
    let credits = 0
    let topSku: string | null = null
    let topSkuCredits = -Infinity
    bySku.forEach((skuCredits, sku) => {
      credits += skuCredits
      if (skuCredits > topSkuCredits) {
        topSku = sku
        topSkuCredits = skuCredits
      }
    })
    return { workspace, credits, topSku }
  })

  const totalCredits = totals.reduce((sum, { credits }) => sum + credits, 0)

  return {
    totalCredits,
    workspaces: totals.map(({ workspace, credits, topSku }) => ({
      workspace,
      credits,
      share: totalCredits > 0 ? credits / totalCredits : 0,
      topSku,
      previousCredits: previousPeriodStart ? previousByWorkspace.get(workspace) ?? 0 : null,
    })),
  }
}

// Fractional change from the previous period: null when there is nothing to compare against,
// Infinity for a workspace with no usage in the previous period.
export const getUsageChange = ({ credits, previousCredits }: WorkspaceUsageSummary) => {
  if (previousCredits === null) return null
  if (previousCredits === 0) return credits === 0 ? 0 : Infinity
  return (credits - previousCredits) / previousCredits
}
