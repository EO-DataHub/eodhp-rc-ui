import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ALPHA_ACCOUNT,
  HubApi,
  installHubApi,
  NOW,
  stubRadixBrowserApis,
} from '@/test-data/hubUsage'
import {
  chooseSku,
  columnHeader,
  expectUsageRange,
  groupByOf,
  isHighlighted,
  nameInput,
  nextButton,
  periodTypeRadio,
  previousButton,
  rankedNames,
  renderHub,
  rowFor,
  table,
} from '@/test-data/hubUsagePage'

const ALPHA_USAGE = '/api/workspaces/ws-alpha/accounting/usage-data'

const OCTOBER = { start: '2026-09-01T00:00:00Z', end: '2026-11-01T00:00:00Z', type: 'month' }
const SEPTEMBER = { start: '2026-08-01T00:00:00Z', end: '2026-10-01T00:00:00Z', type: 'month' }
const NOVEMBER = { start: '2026-10-01T00:00:00Z', end: '2026-12-01T00:00:00Z', type: 'month' }

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

const openRanking = async () => {
  const user = userEvent.setup()
  const view = renderHub('/accounting/hub')
  await screen.findAllByText('ws-alpha')
  return { user, ...view }
}

/** Opens the ranking, lets `prepare` set it up, then opens ws-alpha from its row. */
const openAlpha = async (prepare?: (user: ReturnType<typeof userEvent.setup>) => Promise<void>) => {
  const ranking = await openRanking()
  if (prepare) await prepare(ranking.user)
  await ranking.user.click(within(table()).getByText('ws-alpha'))
  await waitFor(() => expect(api.lastUsageRequest(ALPHA_USAGE)).toBeDefined())
  await waitFor(() => expect(skuRow('Workflow CPU')).toBeDefined())
  return ranking
}

const skuRow = (name: string) => {
  const tables = screen.queryAllByRole('table')
  if (tables.length === 0) return undefined
  return rowFor(name)
}

describe('Stage 4: workspace drill-down', () => {
  it('opens /accounting/hub/:workspace from a ranking row with the same period', async () => {
    const { location } = await openAlpha()
    expect(location()).toMatch(/^\/accounting\/hub\/ws-alpha(\?|#|$)/)
    await expectUsageRange(api, OCTOBER, ALPHA_USAGE)
  })

  it('keeps a period stepped to on the ranking', async () => {
    await openAlpha(async (user) => {
      await user.click(previousButton())
      await expectUsageRange(api, SEPTEMBER)
    })
    await expectUsageRange(api, SEPTEMBER, ALPHA_USAGE)
  })

  it("reads the workspace's usage grouped by SKU", async () => {
    await openAlpha()
    const params = api.lastUsageRequest(ALPHA_USAGE).params
    expect(groupByOf(params)).toEqual(['sku'])
    expect(params.has('sku')).toBe(false)
  })

  it('shows the workspace name, current balance, account and category', async () => {
    await openAlpha()
    const page = document.body
    expect(screen.getAllByText(/ws-alpha/).length).toBeGreaterThan(0)
    expect(page).toHaveTextContent('1,250.50')
    expect(page).toHaveTextContent(ALPHA_ACCOUNT)
    expect(page).toHaveTextContent('academic')
  })

  it('shows usage by SKU in credits with change against the previous period', async () => {
    await openAlpha()
    const cpu = skuRow('Workflow CPU')
    expect(cpu).toHaveTextContent('1,500.00')
    expect(cpu).toHaveTextContent('+904.50')
    const storage = skuRow('Storage')
    expect(storage).toHaveTextContent('300.00')
    expect(storage).toHaveTextContent('New')
  })

  it('shows every SKU the workspace used under a SKU filter, highlighting the filtered one', async () => {
    await openAlpha(async (user) => {
      await chooseSku(user, 'Storage')
      await waitFor(() => expect(api.lastUsageRequest().params.get('sku')).toBe('storage'))
      await waitFor(() => expect(rankedNames()).toEqual(['ws-beta', 'ws-alpha']))
    })
    expect(api.lastUsageRequest(ALPHA_USAGE).params.has('sku')).toBe(false)
    expect(skuRow('Workflow CPU')).toBeDefined()
    expect(skuRow('Storage')).toBeDefined()
    expect(isHighlighted(skuRow('Storage'))).toBe(true)
    expect(isHighlighted(skuRow('Workflow CPU'))).toBe(false)
  })

  it('shows values and change in each SKU unit in Raw usage', async () => {
    const { user } = await openAlpha()
    expect(screen.getByRole('radio', { name: 'Credits' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: 'Raw usage' }))

    await waitFor(() => expect(skuRow('Workflow CPU')).not.toHaveTextContent('1,500.00'))
    const cpu = skuRow('Workflow CPU')
    expect(cpu?.textContent).toMatch(/3,?000/)
    expect(cpu?.textContent).toMatch(/\+1,?809/)
    expect(cpu).toHaveTextContent('cpu-seconds')
    const storage = skuRow('Storage')
    const storageCells = Array.from(storage?.querySelectorAll('th, td') ?? []).map(
      (cell) => cell.textContent?.trim() ?? '',
    )
    expect(storageCells.some((text) => /^30(?![\d.,]*\d)/.test(text))).toBe(true)
    expect(storage).toHaveTextContent('GB-hours')
    expect(storage).toHaveTextContent('New')
  })

  it('hides the change column while the period is in progress', async () => {
    const { user } = await openAlpha()
    expect(columnHeader(/^Change/i)).toBeDefined()
    await user.click(nextButton())
    await expectUsageRange(api, NOVEMBER, ALPHA_USAGE)
    expect(await screen.findByText(/\(in progress\)/)).toBeInTheDocument()
    await waitFor(() => expect(skuRow('Workflow CPU')).toBeDefined())
    expect(columnHeader(/^Change/i)).toBeUndefined()
  })

  it('steps the period and changes its type', async () => {
    const { user } = await openAlpha()
    await user.click(previousButton())
    await expectUsageRange(api, SEPTEMBER, ALPHA_USAGE)
    await user.click(periodTypeRadio('Week'))
    await expectUsageRange(
      api,
      { start: '2026-10-19T00:00:00Z', end: '2026-11-02T00:00:00Z', type: 'week' },
      ALPHA_USAGE,
    )
  })

  it('goes back to the ranking with its period, SKU filter and name filter', async () => {
    const { user, location } = await openAlpha(async (rankingUser) => {
      await rankingUser.click(previousButton())
      await expectUsageRange(api, SEPTEMBER)
      await chooseSku(rankingUser, 'Storage')
      await waitFor(() => expect(api.lastUsageRequest().params.get('sku')).toBe('storage'))
      await rankingUser.type(nameInput(), 'ALP')
      await waitFor(() => expect(rankedNames()).toEqual(['ws-alpha']))
    })

    await user.click(screen.getByRole('link', { name: /back to all workspaces/i }))

    await waitFor(() => expect(location()).toMatch(/^\/accounting\/hub(\?|#|$)/))
    await expectUsageRange(api, SEPTEMBER)
    expect(api.lastUsageRequest().params.get('sku')).toBe('storage')
    expect(nameInput()).toHaveValue('ALP')
    await waitFor(() => expect(rankedNames()).toEqual(['ws-alpha']))
  })

  it("shows the API's error when it refuses the request", async () => {
    api.fail(ALPHA_USAGE, 403, { detail: 'Requires the hub_admin role' })
    const { user } = await openRanking()
    await user.click(within(table()).getByText('ws-alpha'))
    expect(await screen.findByText(/Requires the hub_admin role/)).toBeInTheDocument()
  })
})

const WORKSPACES = '/api/accounting/workspaces'
const SKUS = '/api/accounting/skus'

const countOf = (path: string) => api.requests.filter((request) => request.path === path).length

const settle = () => new Promise((resolve) => setTimeout(resolve, 100))

const openAlphaDirectly = async () => {
  const user = userEvent.setup()
  const view = renderHub('/accounting/hub/ws-alpha')
  await waitFor(() => expect(skuRow('Workflow CPU')).toBeDefined())
  return { user, ...view }
}

describe('Stage 5: drill-down while the workspace details load', () => {
  it('shows the SKU table while /accounting/workspaces is pending, then the balance', async () => {
    api = installHubApi({ holdWorkspaces: true })
    renderHub('/accounting/hub/ws-alpha')
    await waitFor(() => expect(countOf(WORKSPACES)).toBeGreaterThan(0))
    await waitFor(() => expect(skuRow('Workflow CPU')).toBeDefined())
    expect(skuRow('Workflow CPU')).toHaveTextContent('1,500.00')
    expect(skuRow('Storage')).toBeDefined()
    expect(document.body).not.toHaveTextContent(ALPHA_ACCOUNT)

    api.releaseWorkspaces()

    await waitFor(() => expect(document.body).toHaveTextContent('1,250.50'))
    expect(document.body).toHaveTextContent(ALPHA_ACCOUNT)
    expect(skuRow('Workflow CPU')).toBeDefined()
  })

  it('shows the SKU table when /accounting/workspaces fails', async () => {
    api.fail(WORKSPACES, 500, { detail: 'Upstream timed out' })
    renderHub('/accounting/hub/ws-alpha')
    await waitFor(() => expect(skuRow('Workflow CPU')).toBeDefined())
    await settle()
    expect(skuRow('Workflow CPU')).toHaveTextContent('1,500.00')
    expect(skuRow('Storage')).toHaveTextContent('300.00')
  })
})

describe('Stage 5: drill-down token refresh and caching', () => {
  it('does not refetch when the token changes for the same user, and uses the new token next', async () => {
    const { updateAuth, user } = await openAlphaDirectly()
    await settle()
    const before = {
      usage: api.usageRequests(ALPHA_USAGE).length,
      workspaces: countOf(WORKSPACES),
      skus: countOf(SKUS),
    }

    updateAuth({ token: 'tok-2', userInfo: { preferred_username: 'alice', sub: 'user-1' } })
    await settle()

    expect({
      usage: api.usageRequests(ALPHA_USAGE).length,
      workspaces: countOf(WORKSPACES),
      skus: countOf(SKUS),
    }).toEqual(before)
    expect(skuRow('Workflow CPU')).toBeDefined()

    await user.click(previousButton())
    await expectUsageRange(api, SEPTEMBER, ALPHA_USAGE)
    expect(api.lastUsageRequest(ALPHA_USAGE).headers.Authorization).toBe('Bearer tok-2')
  })

  it('does not read a period again when returning to it within 5 minutes', async () => {
    const { user } = await openAlphaDirectly()
    await expectUsageRange(api, OCTOBER, ALPHA_USAGE)
    const octoberReads = () =>
      api
        .usageRequests(ALPHA_USAGE)
        .filter(
          (request) =>
            new Date(request.params.get('start') ?? '').getTime() ===
            new Date(OCTOBER.start).getTime(),
        ).length
    expect(octoberReads()).toBe(1)

    await user.click(previousButton())
    await expectUsageRange(api, SEPTEMBER, ALPHA_USAGE)
    await waitFor(() => expect(skuRow('Workflow CPU')).toBeDefined())
    await user.click(nextButton())
    await waitFor(() => expect(skuRow('Workflow CPU')).toHaveTextContent('1,500.00'))
    await settle()

    expect(octoberReads()).toBe(1)
  })

  it('does not refetch on a window focus and keeps the SKU table shown', async () => {
    await openAlphaDirectly()
    await settle()
    const before = {
      usage: api.usageRequests(ALPHA_USAGE).length,
      workspaces: countOf(WORKSPACES),
      skus: countOf(SKUS),
    }

    fireEvent(window, new Event('visibilitychange'))
    fireEvent(window, new Event('focus'))
    await settle()

    expect({
      usage: api.usageRequests(ALPHA_USAGE).length,
      workspaces: countOf(WORKSPACES),
      skus: countOf(SKUS),
    }).toEqual(before)
    expect(skuRow('Workflow CPU')).toBeDefined()
  })
})
