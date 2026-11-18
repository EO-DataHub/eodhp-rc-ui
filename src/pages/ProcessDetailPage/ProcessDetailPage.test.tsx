import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Collection, ProcessDetail } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchItemById } from '@/services/processCatalogueService'
import { useProcessLaunchFromCatalogue } from '@/hooks/useProcessLaunchFromCatalogue'
import { item, ndviWorkflow, notebookRecord, stubBrowserGlobals } from '@/test-data/runWorkflow'
import { ProcessDetailPage } from './ProcessDetailPage'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({ fetchWorkspaceTokens: vi.fn() }))
vi.mock('@/hooks/useProcessLaunchFromCatalogue', () => ({
  useProcessLaunchFromCatalogue: vi.fn(),
}))

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

const notebook = notebookRecord('ndvi_notebook', {
  STAC_ITEM_LINK: { hubType: 'stac-item', type: 'text' },
})

const collectionUrl = 'https://hub.example/collections/sentinel2_ard'

const renderPage = (record: ProcessDetail, authOverrides: Partial<AuthValue> = {}) => {
  vi.mocked(fetchItemById).mockResolvedValue({ data: record, error: null, notFound: false })
  return render(
    <MemoryRouter initialEntries={[`/catalogue/processes/${record.id}`]}>
      <AuthenticationContext.Provider value={auth(authOverrides)}>
        <Routes>
          <Route path="/catalogue/processes/:itemId" element={<ProcessDetailPage />} />
        </Routes>
      </AuthenticationContext.Provider>
    </MemoryRouter>,
  )
}

const runButton = () => screen.findByRole('button', { name: /run workflow/i })

beforeEach(() => {
  stubBrowserGlobals()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  vi.mocked(useProcessLaunchFromCatalogue).mockReturnValue({
    collections: [{ id: 'sentinel2_ard', label: 'Sentinel-2 ARD', url: collectionUrl }],
    selectedCollectionUrl: collectionUrl,
    selectedCollection: { id: 'sentinel2_ard' } as Collection,
    setSelectedCollectionUrl: vi.fn(),
    startDate: null,
    endDate: null,
    setStartDate: vi.fn(),
    setEndDate: vi.fn(),
    items: [item],
    selectedItem: item,
    setSelectedItemId: vi.fn(),
    isLoadingItems: false,
    itemsError: null,
    dateRangeError: null,
    reset: vi.fn(),
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('ProcessDetailPage for a workflow', () => {
  it('opens the Run workflow dialog with the workflow filled in', async () => {
    renderPage(ndviWorkflow)
    fireEvent.click(await runButton())

    const dialog = await screen.findByRole('dialog')
    expect(
      await screen.findByRole('heading', { name: /what do you want to run on/i }),
    ).toBeInTheDocument()
    expect(dialog).toHaveTextContent('NDVI')
    expect(useProcessLaunchFromCatalogue).toHaveBeenCalledWith({ process: ndviWorkflow })
  })

  it('disables Run workflow when signed out', async () => {
    renderPage(ndviWorkflow, {
      isAuthenticated: false,
      token: undefined,
      userInfo: undefined,
      currentWorkspace: undefined,
    })
    expect(await runButton()).toBeDisabled()
    expect(screen.getByText(/sign in to run this workflow/i)).toBeInTheDocument()
  })

  it('does not ask a signed-in user to sign in', async () => {
    renderPage(ndviWorkflow)
    expect(await runButton()).toBeEnabled()
    expect(screen.queryByText(/sign in to run this workflow/i)).toBeNull()
  })
})

describe('ProcessDetailPage for a notebook', () => {
  it('shows the guidance text and no launch button', async () => {
    renderPage(notebook)
    expect(
      await screen.findByText(/to launch this notebook, go to the data catalogue/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /run workflow|launch/i })).toBeNull()
  })
})
