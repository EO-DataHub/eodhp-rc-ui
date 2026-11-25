import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
  landsatWorkflow,
  listRecord,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import { hideRunPanel, renderWithRunPanel, runPanel } from '@/test-data/runPanel'
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
      <QueryClientProvider client={new QueryClient()}>
        <AuthenticationContext.Provider value={auth}>
          <IntegrationToolsPanel item={renderedItem} onClose={vi.fn()} />
        </AuthenticationContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  )

const choose = (tool: Parameters<typeof listRecord>[0]) =>
  act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(tool) }))

beforeEach(() => {
  stubBrowserGlobals()
  hideRunPanel()
  dataFinderStore.send({ type: 'clearTool' })
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchToolByIdFromFixtures)
})

afterEach(() => {
  dataFinderStore.send({ type: 'clearTool' })
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('IntegrationToolsPanel Workflows tab opens the run panel', () => {
  const runFromWorkflowsTab = async (user: ReturnType<typeof userEvent.setup>) => {
    await renderWithRunPanel(<IntegrationToolsPanel item={renderedItem} onClose={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /workflows/i }))
    await user.click(await screen.findByRole('button', { name: /run workflow/i }))
    return runPanel()
  }

  // The panel opens on the process list, and This item is kept for the workflow chosen from it
  const expectToolListForThisItem = async (
    user: ReturnType<typeof userEvent.setup>,
    panel: HTMLElement,
  ) => {
    await within(panel).findByRole('heading', { name: /^processes for /i })
    expect(dataFinderStore.getSnapshot().context.chosenTool).toBeUndefined()

    await user.click(await within(panel).findByText('NDVI', { exact: true }))
    expect(await within(panel).findByRole('radio', { name: /this item/i })).toBeChecked()
    expect(panel).toHaveTextContent(item.id)
  }

  it('sets Run on to this item for the chosen workflow, with no dialog', async () => {
    const user = userEvent.setup()
    choose(ndviWorkflow)
    const panel = await runFromWorkflowsTab(user)

    expect(await within(panel).findByRole('radio', { name: /this item/i })).toBeChecked()
    expect(panel).toHaveTextContent('NDVI')
    expect(panel).toHaveTextContent(item.id)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(panel).queryByRole('heading', { name: /^processes for /i })).toBeNull()
    expect(dataFinderStore.getSnapshot().context.chosenTool?.id).toBe(ndviWorkflow.id)
  })

  it('opens on the process list with no process selected, and keeps this item for the workflow chosen next', async () => {
    const user = userEvent.setup()
    const panel = await runFromWorkflowsTab(user)
    await within(panel).findByRole('heading', { name: /^processes for /i })

    await user.click(await within(panel).findByText('NDVI', { exact: true }))
    expect(await within(panel).findByRole('radio', { name: /this item/i })).toBeChecked()
    expect(panel).toHaveTextContent(item.id)
  })

  it('drops a chosen workflow that does not apply to the item and opens on the process list', async () => {
    const user = userEvent.setup()
    choose(landsatWorkflow)
    const panel = await runFromWorkflowsTab(user)
    await expectToolListForThisItem(user, panel)
  })

  it('drops a chosen notebook and opens on the process list', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    const panel = await runFromWorkflowsTab(user)
    await expectToolListForThisItem(user, panel)
  })
})

describe('IntegrationToolsPanel with a chosen notebook', () => {
  // Let the notebook list request finish, so a select that would appear has had the chance to
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

  it('opens on the Jupyter tab', () => {
    choose(itemNotebook)
    renderPanel()
    expect(screen.getByRole('tab', { name: /jupyter/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the chosen notebook as text instead of the notebook select', async () => {
    choose(itemNotebook)
    renderPanel()
    await settle()
    const jupyter = screen.getByRole('tabpanel')
    expect(jupyter).toHaveTextContent('NDVI notebook')
    expect(within(jupyter).queryAllByRole('radio')).toHaveLength(0)
    expect(within(jupyter).queryByRole('radiogroup')).toBeNull()
    expect(within(jupyter).queryByRole('combobox')).toBeNull()
    expect(within(jupyter).getByRole('button', { name: 'Launch' })).toBeEnabled()
  })

  it('shows the chosen notebook when the user opens the Jupyter tab', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    renderPanel()
    await user.click(screen.getByRole('tab', { name: /desktop gis/i }))
    await user.click(screen.getByRole('tab', { name: /jupyter/i }))
    await settle()
    const jupyter = screen.getByRole('tabpanel')
    expect(jupyter).toHaveTextContent('NDVI notebook')
    expect(within(jupyter).queryAllByRole('radio')).toHaveLength(0)
  })

  it('brings the notebook select back when the tool is cleared', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    renderPanel()
    await settle()
    act(() => dataFinderStore.send({ type: 'clearTool' }))
    await user.click(screen.getByRole('tab', { name: /jupyter/i }))
    expect(await screen.findByRole('radio', { name: /ndvi notebook/i })).toBeInTheDocument()
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

describe('IntegrationToolsPanel with a chosen notebook that does not apply to the item', () => {
  // A dataset with renders, so the panel shows, that the notebook does not list
  const sentinel1Item = {
    ...item,
    id: 'S1A_20250610',
    collection: 'sentinel1_ard',
    render: { id: getAvailableRenders('sentinel1_ard')[0].id },
    collectionRef: { id: 'sentinel1_ard' },
  } as Item

  const renderSentinel1Panel = () =>
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <AuthenticationContext.Provider value={auth}>
            <IntegrationToolsPanel item={sentinel1Item} onClose={vi.fn()} />
          </AuthenticationContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )

  it('shows the notebook select, as with no tool chosen', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    renderSentinel1Panel()
    await user.click(screen.getByRole('tab', { name: /jupyter/i }))

    const jupyter = screen.getByRole('tabpanel')
    expect(await within(jupyter).findByRole('radio', { name: /ndvi notebook/i })).not.toBeChecked()
  })

  it('does not offer a chosen workflow that does not apply, as with no tool chosen', async () => {
    const user = userEvent.setup()
    choose(ndviWorkflow)
    renderSentinel1Panel()

    await user.click(screen.getByRole('tab', { name: /workflows/i }))
    expect(screen.getByRole('tabpanel')).not.toHaveTextContent('Run NDVI on this item')
  })
})
