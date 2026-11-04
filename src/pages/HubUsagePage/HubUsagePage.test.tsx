import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  HubApi,
  installHubApi,
  NOW,
  stubRadixBrowserApis,
  usageWithZeroCredits,
} from '@/test-data/hubUsage'
import {
  cellOf,
  cellText,
  choosePeriod,
  clickColumnHeader,
  columnHeader,
  columnValues,
  expectUsageRange,
  groupByOf,
  isBusy,
  loadingIndicator,
  nameInput,
  nextButton,
  parseCredits,
  periodTypeRadio,
  previousButton,
  rankedNames,
  renderHub,
  rowFor,
  periodMenuButton,
  periodMenuIsOpen,
  periodMenuItemNames,
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
    await choosePeriod(user, /^October 2026/, 'May 2026')
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
    const { user, location } = await openRanking()
    const startParam = () => new URLSearchParams(location().split('?')[1] ?? '').get('start')
    await user.click(previousButton())
    await expectUsageRange(api, SEPTEMBER)
    await waitFor(() => expect(startParam()).toMatch(/^2026-09-01/))
    expect(await screen.findByText('September 2026')).toBeInTheDocument()
    await user.click(nextButton())
    await waitFor(() => expect(startParam()).toMatch(/^2026-10-01/))
    expect(await screen.findByText('October 2026')).toBeInTheDocument()
    expect(screen.queryByText('September 2026')).not.toBeInTheDocument()
    await waitFor(() => expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma']))
    expect(cellText('ws-alpha', /^Total/i)).toBe('1,800.00')
  })

  it('steps to the current period, labels it in progress, and goes no further', async () => {
    const { user } = await openRanking()
    await user.click(nextButton())
    await expectUsageRange(api, NOVEMBER)
    expect(await screen.findByText(/\(in progress\)/)).toBeInTheDocument()
    expect(nextButton()).toBeDisabled()
  })

  it('restores the period and name filter from the URL', async () => {
    const { user, location, unmount } = await openRanking()
    await choosePeriod(user, /^October 2026/, 'May 2026')
    await expectUsageRange(api, MAY)
    await user.type(nameInput(), 'ALP')
    await waitFor(() => expect(location()).toMatch(/ALP/i))
    const url = location()
    unmount()

    const restoredApi = installHubApi()
    renderHub(url)
    await expectUsageRange(restoredApi, MAY)
    expect(periodTypeRadio('Month')).toHaveAttribute('aria-checked', 'true')
    expect(await screen.findByText('May 2026')).toBeInTheDocument()
    expect(nameInput()).toHaveValue('ALP')
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

describe('Stage 3: loading, empty ranking and exact credit sums', () => {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 100))

  it('shows no empty or zero ranking while the SKU list is still loading', async () => {
    api = installHubApi({ holdSkus: true })
    renderHub('/accounting/hub')
    await waitFor(() =>
      expect(api.requests.some((request) => request.path === '/api/accounting/skus')).toBe(true),
    )
    await pause()

    expect(screen.queryByText(/No workspaces match/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/No usage/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/workspaces? had no usage/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^0\.00$/)).not.toBeInTheDocument()
    if (screen.queryByRole('table')) {
      expect(totalsRow()).toBeUndefined()
    }

    api.releaseSkus()
    await screen.findAllByText('ws-alpha')
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
    expect(totalsRow()).toHaveTextContent('3,000.00')
  })

  it('says No usage in this period when no workspace used anything and there is no name filter', async () => {
    api = installHubApi({ usage: [] })
    renderHub('/accounting/hub')
    await expectUsageRange(api, OCTOBER)
    expect(await within(table()).findByText('No usage in this period')).toBeInTheDocument()
    expect(screen.queryByText('No workspaces match')).not.toBeInTheDocument()
    expect(rankedNames()).toEqual([])
  })

  // In floating point 1000.060 + 1.005 is 1001.0649999..., which rounds to 1,001.06, and
  // 1001.065 - 0.120 is 1000.9449999..., which rounds to +1,000.94.
  const preciseUsage = [
    {
      workspace: 'ws-alpha',
      sku: 'wfcpu',
      current: { credits: '1000.060', quantity: 2000 },
      previous: { credits: '0.120', quantity: 1 },
    },
    { workspace: 'ws-alpha', sku: 'storage', current: { credits: '1.005', quantity: 1 } },
  ]

  it('sums 3-decimal credit strings exactly and rounds the total half away from zero', async () => {
    api = installHubApi({ usage: preciseUsage })
    await openRanking()
    expect(rankedNames()).toEqual(['ws-alpha'])
    expect(cellText('ws-alpha', /^Total/i)).toBe('1,001.07')
    expect(totalsRow()).toHaveTextContent('1,001.07')
  })

  it('works out the change exactly from 3-decimal credit strings', async () => {
    api = installHubApi({ usage: preciseUsage })
    await openRanking()
    expect(cellText('ws-alpha', /^Change/i)).toBe('+1,000.95')
  })
})

const WORKSPACES = '/api/accounting/workspaces'
const SKUS = '/api/accounting/skus'
const USAGE = '/api/accounting/usage-data'

const countOf = (path: string) => api.requests.filter((request) => request.path === path).length

const usageRequestsFor = (range: { start: string }) =>
  api
    .usageRequests(USAGE)
    .filter(
      (request) =>
        new Date(request.params.get('start') ?? '').getTime() === new Date(range.start).getTime(),
    )

const settle = () => new Promise((resolve) => setTimeout(resolve, 100))

describe('Stage 5: ranking while the balances load', () => {
  it('shows the ranking with loading balances while /accounting/workspaces is pending, then the balances', async () => {
    api = installHubApi({ holdWorkspaces: true })
    renderHub('/accounting/hub')
    await screen.findAllByText('ws-alpha')
    await waitFor(() => expect(countOf(WORKSPACES)).toBeGreaterThan(0))

    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
    expect(cellText('ws-alpha', /^Total/i)).toBe('1,800.00')
    for (const name of ['ws-alpha', 'ws-beta', 'ws-gamma']) {
      expect(isBusy(cellOf(name, /^Balance/i)), `${name} balance is not busy`).toBe(true)
      expect(cellText(name, /^Balance/i)).not.toMatch(/\d/)
    }
    expect(screen.queryByText(/workspaces? had no usage/i)).not.toBeInTheDocument()

    api.releaseWorkspaces()

    await waitFor(() => expect(cellText('ws-alpha', /^Balance/i)).toBe('1,250.50'))
    expect(cellText('ws-beta', /^Balance/i)).toBe('20.00')
    expect(cellText('ws-gamma', /^Balance/i)).toBe('5,000.00')
    for (const name of ['ws-alpha', 'ws-beta', 'ws-gamma']) {
      expect(isBusy(cellOf(name, /^Balance/i))).toBe(false)
    }
    expect(await screen.findByText(/2 workspaces had no usage in this period/)).toBeInTheDocument()
  })

  it('shows the ranking with — balances and a warning when /accounting/workspaces fails', async () => {
    api.fail(WORKSPACES, 500, { detail: 'Upstream timed out' })
    renderHub('/accounting/hub')
    await screen.findAllByText('ws-alpha')

    expect(await screen.findByText(/balances could not be loaded/i)).toBeInTheDocument()
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
    expect(cellText('ws-alpha', /^Total/i)).toBe('1,800.00')
    expect(totalsRow()).toHaveTextContent('3,000.00')
    for (const name of ['ws-alpha', 'ws-beta', 'ws-gamma']) {
      expect(cellText(name, /^Balance/i)).toBe('—')
      expect(isBusy(cellOf(name, /^Balance/i))).toBe(false)
    }
    expect(screen.queryByText(/workspaces? had no usage/i)).not.toBeInTheDocument()
  })
})

describe('Stage 5: ranking token refresh and caching', () => {
  it('does not refetch when the token changes for the same user, and uses the new token next', async () => {
    const { updateAuth } = await openRanking()
    await waitFor(() => expect(countOf(WORKSPACES)).toBe(1))
    await waitFor(() => expect(countOf(SKUS)).toBe(1))
    await settle()
    const before = { usage: countOf(USAGE), workspaces: countOf(WORKSPACES), skus: countOf(SKUS) }

    updateAuth({ token: 'tok-2', userInfo: { preferred_username: 'alice', sub: 'user-1' } })
    await settle()

    expect({
      usage: countOf(USAGE),
      workspaces: countOf(WORKSPACES),
      skus: countOf(SKUS),
    }).toEqual(before)
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])

    await userEvent.setup().click(previousButton())
    await expectUsageRange(api, SEPTEMBER)
    expect(api.lastUsageRequest().headers.Authorization).toBe('Bearer tok-2')
  })

  it('sends no hub read until the user is known, then each read once', async () => {
    const { updateAuth } = renderHub('/accounting/hub', { userInfo: undefined })
    await settle()
    expect(loadingIndicator()).not.toBeNull()
    expect(countOf(USAGE)).toBe(0)
    expect(countOf(WORKSPACES)).toBe(0)
    expect(countOf(SKUS)).toBe(0)

    updateAuth({ userInfo: { preferred_username: 'alice', sub: 'user-1' } })
    await screen.findAllByText('ws-alpha')
    await waitFor(() => expect(countOf(WORKSPACES)).toBe(1))
    await waitFor(() => expect(countOf(SKUS)).toBe(1))
    await settle()

    expect({
      usage: countOf(USAGE),
      workspaces: countOf(WORKSPACES),
      skus: countOf(SKUS),
    }).toEqual({ usage: 1, workspaces: 1, skus: 1 })
  })

  it('refetches when a different user signs in', async () => {
    const { updateAuth } = await openRanking()
    await settle()
    const before = countOf(USAGE)
    updateAuth({ token: 'tok-2', userInfo: { preferred_username: 'bob', sub: 'user-2' } })
    await waitFor(() => expect(countOf(USAGE)).toBeGreaterThan(before))
  })

  it('does not read a period again when returning to it within 5 minutes', async () => {
    const { user } = await openRanking()
    await expectUsageRange(api, OCTOBER)
    expect(usageRequestsFor(OCTOBER)).toHaveLength(1)

    await user.click(previousButton())
    await expectUsageRange(api, SEPTEMBER)
    await waitFor(() => expect(totalsRow()).toBeDefined())
    vi.setSystemTime(new Date(NOW.getTime() + 4 * 60 * 1000))
    await user.click(nextButton())
    await waitFor(() => expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma']))
    await settle()

    expect(usageRequestsFor(OCTOBER)).toHaveLength(1)
    expect(cellText('ws-alpha', /^Total/i)).toBe('1,800.00')
  })

  it('reads a period again when returning to it after more than 5 minutes', async () => {
    const { user } = await openRanking()
    await user.click(previousButton())
    await expectUsageRange(api, SEPTEMBER)
    await waitFor(() => expect(totalsRow()).toBeDefined())
    vi.setSystemTime(new Date(NOW.getTime() + 6 * 60 * 1000))
    await user.click(nextButton())
    await waitFor(() => expect(usageRequestsFor(OCTOBER)).toHaveLength(2))
  })

  it('does not refetch on a window focus and keeps the ranking shown', async () => {
    await openRanking()
    await waitFor(() => expect(countOf(WORKSPACES)).toBe(1))
    await settle()
    const before = { usage: countOf(USAGE), workspaces: countOf(WORKSPACES), skus: countOf(SKUS) }

    fireEvent(window, new Event('visibilitychange'))
    fireEvent(window, new Event('focus'))
    await settle()

    expect({
      usage: countOf(USAGE),
      workspaces: countOf(WORKSPACES),
      skus: countOf(SKUS),
    }).toEqual(before)
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
  })
})

describe('Stage 6: a start date that does not exist', () => {
  it.each(['2026-02-30', '2026-04-31', 'not-a-date'])(
    'opens the last complete month for ?type=month&start=%s',
    async (start) => {
      renderHub(`/accounting/hub?type=month&start=${start}`)
      await screen.findAllByText('ws-alpha')
      await expectUsageRange(api, OCTOBER)
      expect(await screen.findByText('October 2026')).toBeInTheDocument()
      expect(screen.queryByText(/March 2026|May 2026/)).not.toBeInTheDocument()
    },
  )

  it('still opens a real leap day', async () => {
    renderHub('/accounting/hub?type=month&start=2024-02-29')
    await expectUsageRange(api, {
      start: '2024-01-01T00:00:00Z',
      end: '2024-03-01T00:00:00Z',
      type: 'month',
    })
  })
})

describe('Stage 6: the current period ends while the page is open', () => {
  // The last minute of 3 November 2026; the day period ends at midnight UTC.
  const JUST_BEFORE_MIDNIGHT = new Date('2026-11-03T23:59:30Z')

  // Load the lazy pages with real timers, so a cold import does not race the fake clock.
  beforeAll(async () => {
    await import('@/pages/HubUsagePage/HubUsagePage')
    await import('@/pages/HubUsagePage/HubWorkspaceUsagePage')
  })

  it.each(['/accounting/hub', '/accounting/hub/ws-alpha'])(
    'at %s, drops the in-progress label and enables Next within a minute of the end',
    async (path) => {
      // beforeEach fakes only Date; vitest ignores a second useFakeTimers call while time is faked.
      vi.useRealTimers()
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(JUST_BEFORE_MIDNIGHT)
      renderHub(`${path}?type=day&start=2026-11-03`)
      expect(await screen.findByText(/\(in progress\)/)).toBeInTheDocument()
      expect(nextButton()).toBeDisabled()

      // 30 seconds to the end of the day, then up to a minute for the page to notice.
      act(() => {
        vi.advanceTimersByTime(90 * 1000)
      })

      await waitFor(() => expect(screen.queryByText(/\(in progress\)/)).not.toBeInTheDocument())
      expect(nextButton()).not.toBeDisabled()
    },
  )
})

describe('Stage 6: default period in the URL', () => {
  const ALPHA_USAGE = '/api/workspaces/ws-alpha/accounting/usage-data'
  // A ranking URL with a start, so going back has somewhere to land other than the page itself.
  const EARLIER = '/accounting/hub?type=week&start=2026-10-26'

  const paramsOf = (url: string) => new URLSearchParams(url.split('?')[1]?.split('#')[0] ?? '')

  beforeAll(async () => {
    await import('@/pages/HubUsagePage/HubUsagePage')
    await import('@/pages/HubUsagePage/HubWorkspaceUsagePage')
  })

  it.each([
    ['/accounting/hub', 'month', '2026-10-01'],
    ['/accounting/hub?type=week', 'week', '2026-10-26'],
  ])(
    'opening %s writes the last complete period into the URL in place of the entry',
    async (entry, type, start) => {
      const { location, back } = renderHub([EARLIER, entry])
      await screen.findAllByText('ws-alpha')

      await waitFor(() =>
        expect(paramsOf(location()).get('start') ?? '').toMatch(new RegExp(`^${start}`)),
      )
      expect(location()).toMatch(/^\/accounting\/hub\?/)
      expect(paramsOf(location()).get('type')).toBe(type)

      back()
      await waitFor(() => expect(location()).toBe(EARLIER))
    },
  )

  it('opening the drill-down with no start writes the last complete period into the URL in place of the entry', async () => {
    const { location, back } = renderHub([EARLIER, '/accounting/hub/ws-alpha'])
    await waitFor(() => expect(api.lastUsageRequest(ALPHA_USAGE)).toBeDefined())
    await expectUsageRange(api, OCTOBER, ALPHA_USAGE)

    await waitFor(() => expect(paramsOf(location()).get('start') ?? '').toMatch(/^2026-10-01/))
    expect(location()).toMatch(/^\/accounting\/hub\/ws-alpha\?/)
    expect(paramsOf(location()).get('type')).toBe('month')

    back()
    await waitFor(() => expect(location()).toBe(EARLIER))
  })

  it('opened with no start, keeps showing the same period when the current period ends', async () => {
    // beforeEach fakes only Date; vitest ignores a second useFakeTimers call while time is faked.
    vi.useRealTimers()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-11-03T23:59:30Z'))
    // The last complete day is 2 November; the ranking asks for 1 and 2 November.
    const SECOND_NOVEMBER = {
      start: '2026-11-01T00:00:00Z',
      end: '2026-11-03T00:00:00Z',
      type: 'day',
    }
    const { location, updateAuth } = renderHub('/accounting/hub?type=day')
    expect(await screen.findByText('2 Nov 2026')).toBeInTheDocument()
    await expectUsageRange(api, SECOND_NOVEMBER)

    // Past midnight, then up to a minute for any timer on the page.
    act(() => {
      vi.advanceTimersByTime(90 * 1000)
    })
    // A token refresh for the same user renders the page again without any user action.
    updateAuth({ token: 'tok-2', userInfo: { preferred_username: 'alice', sub: 'user-1' } })
    await act(() => vi.advanceTimersByTimeAsync(200))

    expect(screen.getByText('2 Nov 2026')).toBeInTheDocument()
    expect(screen.queryByText('3 Nov 2026')).not.toBeInTheDocument()
    await expectUsageRange(api, SECOND_NOVEMBER)
    expect(usageRequestsFor(SECOND_NOVEMBER).length).toBe(api.usageRequests(USAGE).length)
    expect(paramsOf(location()).get('start') ?? '').toMatch(/^2026-11-02/)
    expect(paramsOf(location()).get('type')).toBe('day')
  })
})

describe('Stage 7: period menu', () => {
  const MONTHS = [
    'November 2026',
    'October 2026',
    'September 2026',
    'August 2026',
    'July 2026',
    'June 2026',
    'May 2026',
    'April 2026',
    'March 2026',
    'February 2026',
    'January 2026',
    'December 2025',
  ]
  const QUARTERS = [
    'Q4 2026',
    'Q3 2026',
    'Q2 2026',
    'Q1 2026',
    'Q4 2025',
    'Q3 2025',
    'Q2 2025',
    'Q1 2025',
    'Q4 2024',
    'Q3 2024',
    'Q2 2024',
    'Q1 2024',
  ]

  it.each([
    ['Month', /^October 2026/, MONTHS],
    ['Quarter', /^Q3 2026/, QUARTERS],
  ] as const)(
    'lists the 12 most recent %s periods, newest first, ending at the current one',
    async (type, label, expected) => {
      const { user } = await openRanking()
      await user.click(periodTypeRadio(type))
      await waitFor(() => expect(periodMenuButton(label)).toBeInTheDocument())
      const names = await periodMenuItemNames(user, label)
      expect(names).toHaveLength(12)
      expected.forEach((period, index) => expect(names[index]).toMatch(new RegExp(`^${period}`)))
    },
  )

  it('moves to the chosen period, updates the URL start and closes the menu', async () => {
    const { user, location } = await openRanking()
    await choosePeriod(user, /^October 2026/, 'May 2026')
    await expectUsageRange(api, MAY)
    await waitFor(() =>
      expect(new URLSearchParams(location().split('?')[1] ?? '').get('start')).toMatch(
        /^2026-05-01/,
      ),
    )
    await waitFor(() => expect(periodMenuIsOpen()).toBe(false))
    expect(periodMenuButton(/^May 2026/)).toBeInTheDocument()
    await waitFor(() => expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma']))
  })

  it('has no date input', async () => {
    await openRanking()
    expect(document.querySelector('input[type="date"]')).toBeNull()
    expect(screen.queryByText(/go to date/i)).not.toBeInTheDocument()
  })

  it('keeps the period menu open and reads once more when the ranking is refetched', async () => {
    const { user, queryClient } = await openRanking()
    await settle()
    await periodMenuItemNames(user, /^October 2026/)
    const before = countOf(USAGE)

    await act(() => queryClient.invalidateQueries())
    await settle()

    expect(periodMenuIsOpen()).toBe(true)
    expect(countOf(USAGE)).toBe(before + 1)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(periodMenuIsOpen()).toBe(false))
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
  })
})

describe('Stage 7: workspaces with 0 credits are idle', () => {
  it('does not list a workspace whose credits in the period sum to 0 and counts it as idle', async () => {
    api = installHubApi({ usage: usageWithZeroCredits })
    await openRanking()
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
    expect(rowFor('ws-delta')).toBeUndefined()
    expect(rowFor('ws-epsilon')).toBeUndefined()
    expect(totalsRow()).toHaveTextContent('3,000.00')
    expect(await screen.findByText(/2 workspaces had no usage in this period/)).toBeInTheDocument()
  })
})

describe('Stage 7: no SKU filter on the ranking', () => {
  it('has no SKU select and ignores a sku in the URL', async () => {
    await openRanking('/accounting/hub?type=month&start=2026-10-01&sku=storage')
    expect(screen.queryByRole('combobox', { name: /sku/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('listbox', { name: /sku/i })).not.toBeInTheDocument()

    await expectUsageRange(api, OCTOBER)
    expect(api.usageRequests(USAGE).every((request) => !request.params.has('sku'))).toBe(true)
    expect(rankedNames()).toEqual(['ws-alpha', 'ws-beta', 'ws-gamma'])
    expect(totalsRow()).toHaveTextContent('3,000.00')
    expect(cellText('ws-alpha', /^Top SKU/i)).toBe('Workflow CPU')
    expect(await screen.findByText(/2 workspaces had no usage in this period/)).toBeInTheDocument()
    expect(screen.queryByText(/of this SKU/i)).not.toBeInTheDocument()
  })
})
