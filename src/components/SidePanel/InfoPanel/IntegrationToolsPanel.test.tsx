import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import type { Item } from '@/types'
import { getAvailableRenders } from '@/library/integrationTools'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import {
  fetchToolByIdFromFixtures,
  fetchToolsFromFixtures,
  item,
  itemNotebook,
  listRecord,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import { IntegrationToolsPanel } from './IntegrationToolsPanel'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({ fetchWorkspaceTokens: vi.fn() }))

// The panel only shows for items with a render to open in desktop GIS
const renderedItem = {
  ...item,
  render: { id: getAvailableRenders(item.collection)[0].id },
  collectionRef: { id: 'sentinel2_ard' },
} as Item

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

const renderPanel = () =>
  render(
    <MemoryRouter>
      <AuthenticationContext.Provider value={auth}>
        <IntegrationToolsPanel item={renderedItem} onClose={vi.fn()} />
      </AuthenticationContext.Provider>
    </MemoryRouter>,
  )

const choose = (tool: Parameters<typeof listRecord>[0]) =>
  act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(tool) }))

beforeEach(() => {
  stubBrowserGlobals()
  dataFinderStore.send({ type: 'clearTool' })
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchToolByIdFromFixtures)
})

afterEach(() => {
  dataFinderStore.send({ type: 'clearTool' })
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('IntegrationToolsPanel Workflows tab', () => {
  it('opens the Run workflow dialog with this item filled in', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('tab', { name: /workflows/i }))
    await user.click(await screen.findByRole('button', { name: /run workflow/i }))

    const dialog = await screen.findByRole('dialog')
    expect(await screen.findByRole('heading', { name: /choose a workflow/i })).toBeInTheDocument()
    expect(dialog).toHaveTextContent(item.id)
  })
})

describe('IntegrationToolsPanel with a chosen workflow', () => {
  it('opens the Run workflow dialog with the item and the chosen workflow filled in', async () => {
    const user = userEvent.setup()
    choose(ndviWorkflow)
    renderPanel()

    await user.click(screen.getByRole('tab', { name: /workflows/i }))
    await user.click(await screen.findByRole('button', { name: /run workflow/i }))

    const dialog = await screen.findByRole('dialog')
    expect(await screen.findByRole('heading', { name: /check the inputs/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /choose a workflow/i })).toBeNull()
    expect(dialog).toHaveTextContent('NDVI')
    expect(dialog).toHaveTextContent(item.id)
  })
})

describe('IntegrationToolsPanel with a chosen notebook', () => {
  const notebookOption = () => screen.findByRole('radio', { name: /ndvi notebook/i })

  it('opens on the Jupyter tab', () => {
    choose(itemNotebook)
    renderPanel()
    expect(screen.getByRole('tab', { name: /jupyter/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('selects the chosen notebook', async () => {
    choose(itemNotebook)
    renderPanel()
    const jupyter = screen.getByRole('tabpanel')
    expect(await within(jupyter).findByRole('radio', { name: /ndvi notebook/i })).toBeChecked()
    expect(within(jupyter).getByRole('button', { name: 'Launch' })).toBeEnabled()
  })

  it('selects the chosen notebook when the user opens the Jupyter tab', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    renderPanel()
    await user.click(screen.getByRole('tab', { name: /desktop gis/i }))
    await user.click(screen.getByRole('tab', { name: /jupyter/i }))
    expect(await notebookOption()).toBeChecked()
  })
})

describe('IntegrationToolsPanel with no chosen tool', () => {
  it('opens on the Desktop GIS tab', () => {
    renderPanel()
    expect(screen.getByRole('tab', { name: /desktop gis/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('selects no notebook', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('tab', { name: /jupyter/i }))
    expect(await screen.findByRole('radio', { name: /ndvi notebook/i })).not.toBeChecked()
  })
})
