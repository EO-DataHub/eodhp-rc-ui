import { URL as NodeURL } from 'node:url'
import { expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, RouteObject, useLocation, useRoutes } from 'react-router-dom'
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

/** Renders the app's accounting routes at `entry`, signed in, as a hub admin by default. */
export const renderHub = (entry: string, auth: Partial<AuthValue> = {}) => {
  // The shared test setup replaces URL with a stub; the router needs a real one.
  vi.stubGlobal('URL', NodeURL)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let current = entry
  const AccountingRoutes = () => {
    const { pathname, search, hash } = useLocation()
    current = `${pathname}${search}${hash}`
    return useRoutes([accountingRoute() as RouteObject])
  }
  const utils = render(
    <Theme>
      <QueryClientProvider client={queryClient}>
        <AuthenticationContext.Provider value={authValue({ isHubAdmin: true, ...auth })}>
          <MemoryRouter initialEntries={[entry]}>
            <AccountingRoutes />
          </MemoryRouter>
        </AuthenticationContext.Provider>
      </QueryClientProvider>
    </Theme>,
  )
  /** The current router location: pathname, search and hash. */
  const location = () => current
  return { ...utils, location }
}

// Period controls

export const periodTypeRadio = (name: 'Day' | 'Week' | 'Month' | 'Quarter') =>
  screen.getByRole('radio', { name })

export const previousButton = () => screen.getByRole('button', { name: /previous period/i })
export const nextButton = () => screen.getByRole('button', { name: /next period/i })
export const dateInput = () => screen.getByLabelText(/date/i, { selector: 'input' })

export const pickDate = (value: string) => {
  fireEvent.change(dateInput(), { target: { value } })
}

export const nameInput = () => screen.getByRole('textbox', { name: /name/i })

export const skuControl = () => screen.getByRole('combobox', { name: /sku/i })

/** Opens the SKU filter and returns the names of its options. */
export const skuOptionNames = async (user: User) => {
  const control = skuControl()
  if (control instanceof HTMLSelectElement) {
    return within(control)
      .getAllByRole('option')
      .map((option) => option.textContent?.trim() ?? '')
  }
  await user.click(control)
  const options = await screen.findAllByRole('option')
  const names = options.map((option) => option.textContent?.trim() ?? '')
  await user.keyboard('{Escape}')
  return names
}

export const chooseSku = async (user: User, name: string) => {
  const control = skuControl()
  if (control instanceof HTMLSelectElement) {
    const option = within(control).getByRole<HTMLOptionElement>('option', { name })
    fireEvent.change(control, { target: { value: option.value } })
    return
  }
  await user.click(control)
  await user.click(await screen.findByRole('option', { name }))
}

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

export const cellText = (rowName: string, column: RegExp) => {
  const row = rowFor(rowName)
  if (!row) throw new Error(`No row for ${rowName}`)
  return cellsOf(row)[columnIndex(column)]?.textContent?.trim() ?? ''
}

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
