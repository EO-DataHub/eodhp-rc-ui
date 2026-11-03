import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HubApi, installHubApi, NOW, stubRadixBrowserApis } from '@/test-data/hubUsage'
import {
  cellText,
  chooseSku,
  clickColumnHeader,
  columnHeader,
  columnValues,
  expectUsageRange,
  groupByOf,
  nameInput,
  nextButton,
  parseCredits,
  periodTypeRadio,
  pickDate,
  previousButton,
  rankedNames,
  renderHub,
  rowFor,
  skuControl,
  skuOptionNames,
  table,
  totalsRow,
} from '@/test-data/hubUsagePage'

// With now at Tuesday 3 November 2026, the last complete month is October, and the ranking
// asks for September (the previous period) through the end of October.
const OCTOBER = { start: '2026-09-01T00:00:00Z', end: '2026-11-01T00:00:00Z', type: 'month' }
const SEPTEMBER = { start: '2026-08-01T00:00:00Z', end: '2026-10-01T00:00:00Z', type: 'month' }
const NOVEMBER = { start: '2026-10-01T00:00:00Z', end: '2026-12-01T00:00:00Z', type: 'month' }
const MAY = { start: '2026-04-01T00:00:00Z', end: '2026-06-01T00:00:00Z', type: 'month' }

let api: HubApi

beforeAll(() => {
  stubRadixBrowserApis()
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  api = installHubApi()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  stubRadixBrowserApis()
})

const openRanking = async (entry = '/accounting/hub') => {
  const user = userEvent.setup()
  const view = renderHub(entry)
  await screen.findAllByText('ws-alpha')
  return { user, ...view }
}

describe('Stage 1: hub usage routes and access', () => {
  it.each(['/accounting/hub', '/accounting/hub/ws-alpha'])(
    'tells a user who is not a hub admin at %s that the page is for hub admins only',
    async (entry) => {
      renderHub(entry, { isHubAdmin: false })
      expect(await screen.findByText('Hub admins only')).toBeInTheDocument()
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(api.fetchMock).not.toHaveBeenCalled()
    },
  )

  it.each(['/accounting/hub', '/accounting/hub/ws-alpha'])(
    'shows a hub admin the page at %s',
    async (entry) => {
      renderHub(entry)
      await waitFor(() => expect(api.fetchMock).toHaveBeenCalled())
      expect(screen.queryByText('Hub admins only')).not.toBeInTheDocument()
    },
  )
})

describe('Stage 2: period controls and URL state', () => {
  it('opens on the last complete month', async () => {
    await openRanking()
    expect(periodTypeRadio('Month')).toHaveAttribute('aria-checked', 'true')
    await expectUsageRange(api, OCTOBER)
    expect(screen.queryByText(/\(in progress\)/)).not.toBeInTheDocument()
  })

  it.each([
    ['Day', { start: '2026-11-01T00:00:00Z', end: '2026-11-03T00:00:00Z', type: 'day' }],
    ['Week', { start: '2026-10-19T00:00:00Z', end: '2026-11-02T00:00:00Z', type: 'week' }],
    ['Quarter', { start: '2026-04-01T00:00:00Z', end: '2026-10-01T00:00:00Z', type: 'quarter' }],
  ] as const)(
    'moves to the last complete period when the type changes to %s',
    async (name, range) => {
      const { user } = await openRanking()
      await user.click(periodTypeRadio(name))
      expect(periodTypeRadio(name)).toHaveAttribute('aria-checked', 'true')
      await expectUsageRange(api, range)
    },
  )

  it('moves to the last complete period of the new type, not the one containing the old period', async () => {
    const { user } = await openRanking()
    pickDate('2026-05-14')
    await expectUsageRange(api, MAY)
    await user.click(periodTypeRadio('Quarter'))
    // The third quarter, not the second quarter that contains May.
    await expectUsageRange(api, {
      start: '2026-04-01T00:00:00Z',
      end: '2026-10-01T00:00:00Z',
      type: 'quarter',
    })
  })

  it('steps to the previous and next period', async () => {
    const { user } = await openRanking()
    await user.click(previousButton())
    await expectUsageRange(api, SEPTEMBER)
    await user.click(nextButton())
    await expectUsageRange(api, OCTOBER)
  })

  it('selects the period containing the picked date', async () => {
    await openRanking()
    pickDate('2026-05-14')
    await expectUsageRange(api, MAY)
  })

  it('steps to the current period, labels it in progress, and goes no further', async () => {
    const { user } = await openRanking()
    await user.click(nextButton())
    await expectUsageRange(api, NOVEMBER)
    expect(await screen.findByText(/\(in progress\)/)).toBeInTheDocument()
    expect(nextButton()).toBeDisabled()
  })

  it('does not let the date picker go past the current period', async () => {
    await openRanking()
    pickDate('2027-01-15')
    await new Promise((resolve) => setTimeout(resolve, 50))
    const latestEnd = Math.max(
      ...api.usageRequests().map((request) => new Date(request.params.get('end')!).getTime()),
    )
    expect(latestEnd).toBeLessThanOrEqual(new Date(NOVEMBER.end).getTime())
  })

  it('restores the period, SKU filter and name filter from the URL', async () => {
    const { user, location, unmount } = await openRanking()
    pickDate('2026-05-14')
    await expectUsageRange(api, MAY)
    await chooseSku(user, 'Storage')
    await waitFor(() => expect(api.lastUsageRequest().params.get('sku')).toBe('storage'))
    await user.type(nameInput(), 'ALP')
    await waitFor(() => expect(location()).toMatch(/ALP/i))
    const url = location()
    unmount()

    const restoredApi = installHubApi()
    renderHub(url)
    await expectUsageRange(restoredApi, MAY)
    expect(restoredApi.lastUsageRequest().params.get('sku')).toBe('storage')
    expect(periodTypeRadio('Month')).toHaveAttribute('aria-checked', 'true')
    expect(nameInput()).toHaveValue('ALP')
    const control = skuControl()
    if (control instanceof HTMLSelectElement) {
      expect(control.selectedOptions[0]?.textContent).toBe('Storage')
    } else {
      expect(control).toHaveTextContent('Storage')
    }
  })

  it('restores the period type from the URL', async () => {
    const { user, location, unmount } = await openRanking()
    await user.click(periodTypeRadio('Week'))
    await user.click(previousButton())
    const week = { start: '2026-10-12T00:00:00Z', end: '2026-10-26T00:00:00Z', type: 'week' }
    await expectUsageRange(api, week)
    const url = location()
    unmount()

    const restoredApi = installHubApi()
    renderHub(url)
    await expectUsageRange(restoredApi, week)
    expect(periodTypeRadio('Week')).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Stage 3: ranking table and filters', () => {
  it('asks for both periods in one hub-wide read grouped by workspace and SKU', async () => {
    await openRanking()
    await expectUsageRange(api, OCTOBER)
    const params = api.lastUsageRequest().params
    expect(groupByOf(params)).toEqual(['sku', 'workspace'])
    expect(params.has('sku')).toBe(false)
  })

  it('shows total, share, top SKU, change and balance in credits for each workspace', async () => {
    await openRanking()
    expect(cellText('ws-alpha', /^Total/i)).toBe('1,800.00')
    expect(cellText('ws-alpha', /^Share/i)).toMatch(/^60(\.0+)?\s?%$/)
    expect(cellText('ws-alpha', /^Top SKU/i)).toBe('Workflow CPU')
    expect(cellText('ws-alpha', /^Change/i)).toBe('+1,204.50')
    expect(cellText('ws-alpha', /^Balance/i)).toBe('1,250.50')

    expect(cellText('ws-beta', /^Total/i)).toBe('900.00')
    expect(cellText('ws-beta', /^Share/i)).toMatch(/^30(\.0+)?\s?%$/)
    expect(cellText('ws-beta', /^Top SKU/i)).toBe('Storage')
    expect(cellText('ws-beta', /^Balance/i)).toBe('20.00')

    expect(cellText('ws-gamma', /^Total/i)).toBe('300.00')
    expect(cellText('ws-gamma', /^Share/i)).toMatch(/^10(\.0+)?\s?%$/)
    expect(cellText('ws-gamma', /^Change/i)).toMatch(/^[-−]50\.00$/)
    expect(cellText('ws-gamma', /^Balance/i)).toBe('5,000.00')
  })

  it('shows New for a workspace with no usage in the previous period', async () => {
    await openRanking()
    expect(cellText('ws-beta', /^Change/i)).toBe('New')
  })

  it('shows the total across all workspaces in a totals row', async () => {
    await openRanking()
    expect(totalsRow()).toBeDefined()
    expect(totalsRow()).toHaveTextContent('3,000.00')
  })

  it('sorts by total, descending, by default', async () => {
    await openRanking()
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
    expect(columnHeader(/^Total/i)).toHaveAttribute('aria-sort', 'descending')
  })

  const sortKeys: [RegExp, (text: string) => string | number][] = [
    [/^Workspace/i, (text) => text],
    [/^Total/i, parseCredits],
    [/^Share/i, parseCredits],
    [/^Top SKU/i, (text) => text],
    [/^Change/i, (text) => (text === 'New' ? Number.POSITIVE_INFINITY : parseCredits(text))],
    [/^Balance/i, parseCredits],
  ]

  const isOrdered = (values: (string | number)[], direction: string) =>
    values.every((value, index) => {
      if (index === 0) return true
      const previous = values[index - 1]
      const comparison =
        typeof value === 'number' && typeof previous === 'number'
          ? previous - value
          : String(previous).localeCompare(String(value))
      return direction === 'ascending' ? comparison <= 0 : comparison >= 0
    })

  it.each(sortKeys)('sorts by the %s column both ways', async (column, key) => {
    const { user } = await openRanking()
    const directions: string[] = []
    for (let click = 0; click < 2; click += 1) {
      await clickColumnHeader(user, column)
      const direction = columnHeader(column)?.getAttribute('aria-sort') ?? ''
      expect(['ascending', 'descending']).toContain(direction)
      directions.push(direction)
      let values = columnValues(column).map(key)
      if (direction === 'ascending') {
        values = values.filter((value) => value !== Number.POSITIVE_INFINITY)
      }
      expect(
        isOrdered(values, direction),
        `${String(column)} ${direction}: ${JSON.stringify(values)}`,
      ).toBe(true)
    }
    expect(new Set(directions).size).toBe(2)
    for (const [other] of sortKeys) {
      if (other === column) continue
      expect(columnHeader(other)?.getAttribute('aria-sort') ?? 'none').toBe('none')
    }
  })

  it('sorts New above every number when sorting by change, descending', async () => {
    const { user } = await openRanking()
    await clickColumnHeader(user, /^Change/i)
    if (columnHeader(/^Change/i)?.getAttribute('aria-sort') !== 'descending') {
      await clickColumnHeader(user, /^Change/i)
    }
    expect(columnHeader(/^Change/i)).toHaveAttribute('aria-sort', 'descending')
    expect(rankedNames()).toEqual(['ws-beta', 'ws-alpha', 'ws-gamma'])
  })

  it('hides the change column while the period is in progress', async () => {
    const { user } = await openRanking()
    expect(columnHeader(/^Change/i)).toBeDefined()
    await user.click(nextButton())
    await expectUsageRange(api, NOVEMBER)
    await screen.findByText(/\(in progress\)/)
    await waitFor(() => expect(rowFor('ws-alpha')).toBeDefined())
    expect(columnHeader(/^Change/i)).toBeUndefined()
  })

  it('does not list workspaces with no usage and says how many there are', async () => {
    await openRanking()
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
    expect(rowFor('ws-delta')).toBeUndefined()
    expect(rowFor('ws-epsilon')).toBeUndefined()
    expect(await screen.findByText(/2 workspaces had no usage in this period/)).toBeInTheDocument()
  })

  it('has no Raw usage toggle', async () => {
    await openRanking()
    expect(screen.queryByRole('radio', { name: /raw usage/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/raw usage/i)).not.toBeInTheDocument()
  })

  it('lists SKUs by name in the SKU filter', async () => {
    const { user } = await openRanking()
    const names = await skuOptionNames(user)
    expect(names).toEqual(expect.arrayContaining(['Workflow CPU', 'Storage', 'GPU hours']))
    await waitFor(() =>
      expect(api.requests.some((request) => request.path === '/api/accounting/skus')).toBe(true),
    )
  })

  it('counts only the filtered SKU and hides the top SKU column', async () => {
    const { user } = await openRanking()
    await chooseSku(user, 'Storage')
    await waitFor(() => expect(api.lastUsageRequest().params.get('sku')).toBe('storage'))
    await waitFor(() => expect(rowFor('ws-gamma')).toBeUndefined())

    expect(rankedNames()).toEqual(['ws-beta', 'ws-alpha'])
    expect(cellText('ws-alpha', /^Total/i)).toBe('300.00')
    expect(cellText('ws-alpha', /^Share/i)).toMatch(/^30(\.0+)?\s?%$/)
    expect(cellText('ws-alpha', /^Change/i)).toBe('New')
    expect(cellText('ws-beta', /^Total/i)).toBe('700.00')
    expect(cellText('ws-beta', /^Share/i)).toMatch(/^70(\.0+)?\s?%$/)
    expect(totalsRow()).toHaveTextContent('1,000.00')
    expect(columnHeader(/^Top SKU/i)).toBeUndefined()
  })

  it('under a SKU filter, counts every workspace not in the table as idle and says so for the SKU', async () => {
    const { user } = await openRanking()
    await chooseSku(user, 'Storage')
    await waitFor(() => expect(api.lastUsageRequest().params.get('sku')).toBe('storage'))
    await waitFor(() => expect(rowFor('ws-gamma')).toBeUndefined())
    expect(rankedNames()).toEqual(['ws-beta', 'ws-alpha'])

    // Gamma used only Workflow CPU, delta used Storage only in the previous period, epsilon
    // used nothing: all three are missing from the table.
    expect(
      await screen.findByText(/3 workspaces had no usage of this SKU in this period/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/workspaces had no usage in this period/)).not.toBeInTheDocument()
  })

  it('hides rows that do not match the name filter, ignoring case, without changing share or totals', async () => {
    const { user } = await openRanking()
    await user.type(nameInput(), 'ALP')
    await waitFor(() => expect(rankedNames()).toEqual(['ws-alpha']))
    expect(cellText('ws-alpha', /^Share/i)).toMatch(/^60(\.0+)?\s?%$/)
    expect(totalsRow()).toHaveTextContent('3,000.00')
    expect(api.lastUsageRequest().params.has('sku')).toBe(false)
  })

  it('says No workspaces match when the name filter matches nothing', async () => {
    const { user } = await openRanking()
    await user.type(nameInput(), 'zzz')
    expect(await within(table()).findByText('No workspaces match')).toBeInTheDocument()
    expect(rankedNames()).toEqual([])
  })

  it("shows the API's error when it refuses the request", async () => {
    api.fail('/api/accounting/usage-data', 403, { detail: 'Requires the hub_admin role' })
    renderHub('/accounting/hub')
    expect(await screen.findByText(/Requires the hub_admin role/)).toBeInTheDocument()
  })
})
