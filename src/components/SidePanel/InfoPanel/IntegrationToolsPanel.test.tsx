import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import type { Item } from '@/types'
import { getAvailableRenders } from '@/library/integrationTools'
import { allWorkflows, item, listRecord, stubBrowserGlobals } from '@/test-data/runWorkflow'
import { IntegrationToolsPanel } from './IntegrationToolsPanel'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({ fetchWorkspaceTokens: vi.fn() }))

// The panel only shows for items with a render to open in desktop GIS
const renderedItem = { ...item, render: { id: getAvailableRenders(item.collection)[0].id } } as Item

type AuthValue = React.ContextType<typeof AuthenticationContext>

const auth: AuthValue = {
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
}

beforeEach(() => {
  stubBrowserGlobals()
  vi.mocked(fetchItems).mockResolvedValue({
    data: { items: allWorkflows.map(listRecord) } as never,
    error: null,
  })
  vi.mocked(fetchItemById).mockImplementation((id) =>
    Promise.resolve({
      data: allWorkflows.find((w) => w.id === id)!,
      error: null,
      notFound: false,
    }),
  )
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('IntegrationToolsPanel Workflows tab', () => {
  it('opens the Run workflow dialog with this item filled in', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthenticationContext.Provider value={auth}>
          <IntegrationToolsPanel item={renderedItem} onClose={vi.fn()} />
        </AuthenticationContext.Provider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('tab', { name: /workflows/i }))
    await user.click(await screen.findByRole('button', { name: /run workflow/i }))

    const dialog = await screen.findByRole('dialog')
    expect(await screen.findByRole('heading', { name: /choose a workflow/i })).toBeInTheDocument()
    expect(dialog).toHaveTextContent(item.id)
  })
})
