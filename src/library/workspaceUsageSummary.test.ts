import { describe, expect, it } from 'vitest'
import type { BillingEvent } from '@/services/accountingService'
import { getUsageChange, summarizeWorkspaceUsage } from './workspaceUsageSummary'

const SEPTEMBER = new Date('2026-09-01T00:00:00Z')
const OCTOBER = new Date('2026-10-01T00:00:00Z')

const row = (periodStart: string, workspace: string, item: string, credits: string) =>
  ({
    uuid: `${periodStart}-${workspace}-${item}`,
    event_start: `${periodStart}T00:00:00Z`,
    event_end: `${periodStart}T00:00:00Z`,
    item,
    workspace,
    quantity: 1,
    credits,
  }) as BillingEvent

const rows = [
  row('2026-10-01', 'alpha', 'cpu-seconds', '30'),
  row('2026-10-01', 'alpha', 'gpu-seconds', '50'),
  row('2026-10-01', 'beta', 'cpu-seconds', '20'),
  row('2026-09-01', 'alpha', 'cpu-seconds', '40'),
  row('2026-09-01', 'gamma', 'cpu-seconds', '10'),
]

describe('summarizeWorkspaceUsage', () => {
  it('totals each workspace for the selected period, with its share and top SKU', () => {
    const { totalCredits, workspaces } = summarizeWorkspaceUsage(rows, OCTOBER, SEPTEMBER)

    expect(totalCredits).toBe(100)
    expect(workspaces).toEqual([
      { workspace: 'alpha', credits: 80, share: 0.8, topSku: 'gpu-seconds', previousCredits: 40 },
      { workspace: 'beta', credits: 20, share: 0.2, topSku: 'cpu-seconds', previousCredits: 0 },
    ])
  })

  it('leaves out workspaces with usage only in the previous period', () => {
    const { workspaces } = summarizeWorkspaceUsage(rows, OCTOBER, SEPTEMBER)
    expect(workspaces.map(({ workspace }) => workspace)).not.toContain('gamma')
  })

  it('reports no previous credits when the previous period is not compared', () => {
    const { workspaces } = summarizeWorkspaceUsage(rows, OCTOBER, null)
    expect(workspaces.every(({ previousCredits }) => previousCredits === null)).toBe(true)
  })

  it('gives a zero share when nothing was charged', () => {
    const { workspaces } = summarizeWorkspaceUsage(
      [row('2026-10-01', 'alpha', 'cpu-seconds', '0')],
      OCTOBER,
      null,
    )
    expect(workspaces[0].share).toBe(0)
  })
})

describe('getUsageChange', () => {
  const summary = { workspace: 'alpha', share: 1, topSku: null }

  it('gives the fractional change from the previous period', () => {
    expect(getUsageChange({ ...summary, credits: 150, previousCredits: 100 })).toBe(0.5)
  })

  it('is Infinity for a workspace new in this period and null with no comparison', () => {
    expect(getUsageChange({ ...summary, credits: 10, previousCredits: 0 })).toBe(Infinity)
    expect(getUsageChange({ ...summary, credits: 10, previousCredits: null })).toBeNull()
  })
})
