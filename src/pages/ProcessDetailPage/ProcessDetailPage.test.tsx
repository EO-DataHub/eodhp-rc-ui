import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ProcessDetail } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchItemById } from '@/services/processCatalogueService'
import {
  anyDatasetWorkflow,
  itemNotebook,
  multiDatasetWorkflow,
  ndviWorkflow,
  pinSetNotebook,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import { ProcessDetailPage } from './ProcessDetailPage'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({ fetchWorkspaceTokens: vi.fn() }))

type AuthValue = React.ContextType<typeof AuthenticationContext>

const auth = (overrides: Partial<AuthValue> = {}): AuthValue => ({
  isAuthenticated: true,
  isAuthenticating: false,
  isAuthenticationServiceError: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  token: 'token',
  userInfo: { preferred_username: 'alice' },
  currentWorkspace: 'my-ws',
  updateCurrentWorkspace: vi.fn(),
  clearCurrentWorkspace: vi.fn(),
  ...overrides,
})

const signedOut: Partial<AuthValue> = {
  isAuthenticated: false,
  token: undefined,
  userInfo: undefined,
  currentWorkspace: undefined,
}

/** Stands in for the page the button goes to, and shows where that is. */
const Destination = () => {
  const location = useLocation()
  return <p data-testid="destination">{`${location.pathname}${location.search}`}</p>
}

const renderPage = (record: ProcessDetail, authOverrides: Partial<AuthValue> = {}) => {
  vi.mocked(fetchItemById).mockResolvedValue({ data: record, error: null, notFound: false })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={[`/catalogue/processes/${record.id}`]}>
      <QueryClientProvider client={queryClient}>
        <AuthenticationContext.Provider value={auth(authOverrides)}>
          <Routes>
            <Route path="/catalogue/processes/:itemId" element={<ProcessDetailPage />} />
            <Route path="/finder/*" element={<Destination />} />
            <Route path="/" element={<Destination />} />
          </Routes>
        </AuthenticationContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const runButton = () => screen.findByRole('button', { name: /run workflow/i })
const openInFinderButton = () => screen.findByRole('button', { name: /open in data finder/i })

const destination = async () => (await screen.findByTestId('destination')).textContent

/** The destination's path and query parameters, so the parameter order does not matter. */
const destinationParts = async () => {
  const [pathname, search = ''] = ((await destination()) ?? '').split('?')
  return { pathname, params: Object.fromEntries(new URLSearchParams(search)) }
}

beforeEach(() => {
  stubBrowserGlobals()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ProcessDetailPage for a workflow', () => {
  it("goes to the Data Finder at the workflow's dataset with the workflow chosen", async () => {
    renderPage(ndviWorkflow)
    fireEvent.click(await runButton())
    expect(await destination()).toBe('/finder/sentinel2_ard?tool=ndvi')
  })

  it("goes to the workflow's first dataset and asks the user to pick one when there are several", async () => {
    renderPage(multiDatasetWorkflow)
    fireEvent.click(await runButton())
    expect(await destinationParts()).toEqual({
      pathname: '/finder/landsat_c2l2',
      params: { tool: 'change-detection', pickDataset: '1' },
    })
  })

  it('does not ask the user to pick a dataset when the workflow names one', async () => {
    renderPage(ndviWorkflow)
    fireEvent.click(await runButton())
    expect((await destinationParts()).params).not.toHaveProperty('pickDataset')
  })

  it('goes to the dataset list with no tool chosen when the workflow names no dataset', async () => {
    renderPage(anyDatasetWorkflow)
    fireEvent.click(await runButton())
    expect(await destination()).toBe('/')
  })

  it('does not open the Run workflow dialog', async () => {
    renderPage(ndviWorkflow)
    fireEvent.click(await runButton())
    await destination()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('disables Run workflow when signed out', async () => {
    renderPage(ndviWorkflow, signedOut)
    expect(await runButton()).toBeDisabled()
    expect(screen.getByText(/sign in to run this workflow/i)).toBeInTheDocument()
  })

  it('does not ask a signed-in user to sign in', async () => {
    renderPage(ndviWorkflow)
    expect(await runButton()).toBeEnabled()
    expect(screen.queryByText(/sign in to run this workflow/i)).toBeNull()
  })

  it('has no Open in Data Finder button', async () => {
    renderPage(ndviWorkflow)
    await runButton()
    expect(screen.queryByRole('button', { name: /open in data finder/i })).toBeNull()
  })
})

describe('ProcessDetailPage for an item notebook', () => {
  it("goes to the Data Finder at the notebook's dataset with the notebook chosen", async () => {
    renderPage(itemNotebook)
    fireEvent.click(await openInFinderButton())
    expect(await destination()).toBe('/finder/sentinel2_ard?tool=ndvi_notebook')
  })

  it("goes to the notebook's first dataset and asks the user to pick one when there are several", async () => {
    const multiDatasetNotebook: ProcessDetail = {
      ...itemNotebook,
      properties: {
        ...itemNotebook.properties,
        applicableCollections: ['sentinel-2-c1-l2a', 'sentinel2_ard'],
      },
    }
    renderPage(multiDatasetNotebook)
    fireEvent.click(await openInFinderButton())
    expect(await destinationParts()).toEqual({
      pathname: '/finder/sentinel-2-c1-l2a',
      params: { tool: 'ndvi_notebook', pickDataset: '1' },
    })
  })

  it('does not ask the user to pick a dataset when the notebook names one', async () => {
    renderPage(itemNotebook)
    fireEvent.click(await openInFinderButton())
    expect((await destinationParts()).params).not.toHaveProperty('pickDataset')
  })

  it('goes to the dataset list with no tool chosen when the notebook names no dataset', async () => {
    const anyDatasetNotebook: ProcessDetail = {
      ...itemNotebook,
      properties: { ...itemNotebook.properties, applicableCollections: [] },
    }
    renderPage(anyDatasetNotebook)
    fireEvent.click(await openInFinderButton())
    expect(await destination()).toBe('/')
  })

  it('disables Open in Data Finder when signed out', async () => {
    renderPage(itemNotebook, signedOut)
    expect(await openInFinderButton()).toBeDisabled()
    expect(screen.getByText(/sign in to open this notebook/i)).toBeInTheDocument()
  })

  it('does not ask a signed-in user to sign in', async () => {
    renderPage(itemNotebook)
    expect(await openInFinderButton()).toBeEnabled()
    expect(screen.queryByText(/sign in to open this notebook/i)).toBeNull()
  })

  it('has no Run workflow button', async () => {
    renderPage(itemNotebook)
    await openInFinderButton()
    expect(screen.queryByRole('button', { name: /run workflow/i })).toBeNull()
  })
})

describe('ProcessDetailPage for a pin-set notebook', () => {
  it('shows the guidance text and no launch button', async () => {
    renderPage(pinSetNotebook)
    expect(
      await screen.findByText(/to launch this notebook, go to the data catalogue/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /run workflow|launch|open in data finder/i }),
    ).toBeNull()
  })
})
