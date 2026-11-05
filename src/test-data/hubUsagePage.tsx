import { URL as NodeURL } from 'node:url'
import { expect, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, RouteObject, useLocation, useNavigate, useRoutes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { router as appRouter } from '@/app/router'
import { authValue, AuthValue } from './auth'
import { HubApi, RANKED_WORKSPACES, workspaceSummaries } from './hubUsage'

export type User = ReturnType<typeof userEvent.setup>

// The app's own `/accounting` route tree, so the tests go through the real routes.
const accountingRoute = () => {
  const route = appRouter.routes[0].children?.find((child) => child.path === '/accounting')
  if (!route) throw new Error('No /accounting route in the app router')
  return route
}

/**
 * Renders the app's accounting routes at `entry`, signed in, as a hub admin by default.
 * Given a list of entries, the history holds them all and the page opens at the last one.
 */
export const renderHub = (entry: string | string[], auth: Partial<AuthValue> = {}) => {
  // The shared test setup replaces URL with a stub; the router needs a real one.
  vi.stubGlobal('URL', NodeURL)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const entries = Array.isArray(entry) ? entry : [entry]
  let current = entries[entries.length - 1]
  let navigateBack: () => void = () => undefined
  const AccountingRoutes = () => {
    const { pathname, search, hash } = useLocation()
    const navigate = useNavigate()
    current = `${pathname}${search}${hash}`
    navigateBack = () => navigate(-1)
    return useRoutes([accountingRoute() as RouteObject])
  }
  const tree = (authOverrides: Partial<AuthValue>) => (
    <Theme>
      <QueryClientProvider client={queryClient}>
        <AuthenticationContext.Provider value={authValue({ isHubAdmin: true, ...authOverrides })}>
          <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
            <AccountingRoutes />
          </MemoryRouter>
        </AuthenticationContext.Provider>
      </QueryClientProvider>
    </Theme>
  )
  let currentAuth = auth
  const utils = render(tree(currentAuth))
  /** Rerenders in place with these auth values merged over the current ones, as a token refresh does. */
  const updateAuth = (overrides: Partial<AuthValue>) => {
    currentAuth = { ...currentAuth, ...overrides }
    utils.rerender(tree(currentAuth))
  }
  /** The current router location: pathname, search and hash. */
  const location = () => current
  /** Goes one step back in the router history, as the browser's back button does. */
  const back = () => act(() => navigateBack())
  return { ...utils, location, back, updateAuth, queryClient }
}

// Period controls

export const periodTypeRadio = (name: 'Day' | 'Week' | 'Month' | 'Quarter') =>
  screen.getByRole('radio', { name })

export const previousButton = () => screen.getByRole('button', { name: /previous period/i })
export const nextButton = () => screen.getByRole('button', { name: /next period/i })
export const nameInput = () => screen.getByRole('textbox', { name: /name/i })

/**
 * The period label in the stepper: a button (or a Radix Select trigger) named by the label,
 * for example "October 2026" or "November 2026 (in progress)".
 */
export const periodMenuButton = (label: RegExp) =>
  screen.queryByRole('button', { name: label }) ?? screen.getByRole('combobox', { name: label })

const PERIOD_ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"], [role="option"]'

/** Opens the period menu from the label and returns its items, in order. */
export const openPeriodMenu = async (user: User, label: RegExp) => {
  await user.click(periodMenuButton(label))
  await waitFor(() =>
    expect(document.querySelectorAll(PERIOD_ITEM_SELECTOR).length).toBeGreaterThan(0),
  )
  return Array.from(document.querySelectorAll<HTMLElement>(PERIOD_ITEM_SELECTOR))
}

/** Opens the period menu and returns the text of each item, in order. */
export const periodMenuItemNames = async (user: User, label: RegExp) =>
  (await openPeriodMenu(user, label)).map((item) => item.textContent?.trim() ?? '')

/** Opens the period menu from `label` and chooses the item whose text starts with `item`. */
export const choosePeriod = async (user: User, label: RegExp, item: string) => {
  const items = await openPeriodMenu(user, label)
  const target = items.find((element) => element.textContent?.trim().startsWith(item))
  if (!target) throw new Error(`No period menu item ${item}`)
  await user.click(target)
}

/** True while any period menu item is shown. */
export const periodMenuIsOpen = () => document.querySelectorAll(PERIOD_ITEM_SELECTOR).length > 0

// Requests

const time = (value: string | null) => (value ? new Date(value).getTime() : NaN)

/** Waits until the latest usage request under `pathPrefix` asks for this range and type. */
export const expectUsageRange = async (
  api: HubApi,
  range: { start: string; end: string; type: string },
  pathPrefix = '/api/accounting/usage-data',
) => {
  await waitFor(() => {
    const request = api.lastUsageRequest(pathPrefix)
    expect(request, `no request to ${pathPrefix}`).toBeDefined()
    expect(time(request.params.get('start'))).toBe(time(range.start))
    expect(time(request.params.get('end'))).toBe(time(range.end))
    expect(request.params.get('time-aggregation')).toBe(range.type)
  })
}

export const groupByOf = (params: URLSearchParams) =>
  params
    .getAll('group-by')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .sort()

// Tables

export const table = () => screen.getByRole('table')

const cellsOf = (row: Element) => Array.from(row.querySelectorAll('th, td'))

const headerRow = () => {
  const header = within(table()).getAllByRole('columnheader')[0]
  const row = header.closest('tr')
  if (!row) throw new Error('Column header is not in a row')
  return row
}

export const columnHeader = (name: RegExp) =>
  within(table())
    .getAllByRole('columnheader')
    .find((header) => name.test(header.textContent?.trim() ?? ''))

const columnIndex = (name: RegExp) => {
  const header = columnHeader(name)
  if (!header) throw new Error(`No column ${name}`)
  return cellsOf(headerRow()).indexOf(header)
}

const bodyRows = () =>
  within(table())
    .getAllByRole('row')
    .filter((row) => row !== headerRow())

/** The table row with a cell whose whole text is `name`. */
export const rowFor = (name: string) =>
  bodyRows().find((row) => cellsOf(row).some((cell) => cell.textContent?.trim() === name))

/** The cell of the row for `rowName` under the column whose header matches `column`. */
export const cellOf = (rowName: string, column: RegExp) => {
  const row = rowFor(rowName)
  if (!row) throw new Error(`No row for ${rowName}`)
  const cell = cellsOf(row)[columnIndex(column)]
  if (!cell) throw new Error(`No ${column} cell for ${rowName}`)
  return cell
}

export const cellText = (rowName: string, column: RegExp) =>
  cellOf(rowName, column).textContent?.trim() ?? ''

/** True when the cell, or an element in it, is marked aria-busy="true". */
export const isBusy = (cell: Element) =>
  cell.getAttribute('aria-busy') === 'true' || cell.querySelector('[aria-busy="true"]') !== null

/** The fixture workspaces listed in the ranking, in row order. */
export const rankedNames = () =>
  bodyRows()
    .map((row) =>
      [...RANKED_WORKSPACES, ...workspaceSummaries.map((ws) => ws.workspace)].find((name) =>
        cellsOf(row).some((cell) => cell.textContent?.trim() === name),
      ),
    )
    .filter((name): name is string => Boolean(name))

export const totalsRow = () =>
  bodyRows().find((row) => /^total/i.test(cellsOf(row)[0]?.textContent?.trim() ?? ''))

export const columnValues = (column: RegExp) => {
  const index = columnIndex(column)
  return bodyRows()
    .filter((row) => rankedNames().some((name) => rowFor(name) === row))
    .map((row) => cellsOf(row)[index]?.textContent?.trim() ?? '')
}

export const clickColumnHeader = async (user: User, name: RegExp) => {
  const header = columnHeader(name)
  if (!header) throw new Error(`No column ${name}`)
  await user.click(within(header).queryByRole('button') ?? header)
}

/** Parses a displayed credit figure such as "+1,204.50" or "−50.00". */
export const parseCredits = (text: string) =>
  Number(
    text
      .replace(/−/g, '-')
      .replace(/[^0-9.-]/g, '')
      .trim(),
  )

export const isHighlighted = (row: Element | undefined) =>
  row?.getAttribute('aria-selected') === 'true' || row?.getAttribute('aria-current') === 'true'

/** The page's loading spinner, or null when none is shown. */
export const loadingIndicator = () =>
  document.querySelector('.rt-Spinner, [role="progressbar"], [role="status"]')
