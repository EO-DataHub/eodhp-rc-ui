import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@radix-ui/themes'
import type { Collection, Item } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { fetchItem } from '@/services/itemService'
import {
  fetchToolByIdFromFixtures,
  fetchToolsFromFixtures,
  ITEM_SELF_HREF,
  item,
  itemNotebook,
  listRecord,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import { IntegrationToolsPanel } from '@/components/SidePanel/InfoPanel/IntegrationToolsPanel'
import ItemCard from './ItemCard'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/itemService', () => ({ fetchItem: vi.fn() }))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({ fetchWorkspaceTokens: vi.fn() }))
vi.mock('@/hooks/useGoogleAnalyticsActions', () => ({
  useAnalyticsActions: () => ({ trackViewItemDownloads: vi.fn() }),
}))

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

const collection = {
  id: 'sentinel2_ard',
  title: 'Sentinel-2 ARD',
  links: [],
} as unknown as Collection

const renderCard = (cardItem: Item = item, authValue: AuthValue = auth) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthenticationContext.Provider value={authValue}>
          <Theme>
            <ItemCard item={cardItem} type="query-item" />
          </Theme>
        </AuthenticationContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

/** Shows Integration Tools when the store opens it, as the item panel does. */
const IntegrationToolsHost = () => {
  const {
    secondaryPanel,
    infoPanelItem,
    collection: current,
  } = useSelector(dataFinderStore, ({ context }) => context)
  if (secondaryPanel !== 'integration-tools' || !infoPanelItem) return null
  return (
    <IntegrationToolsPanel
      item={{ ...infoPanelItem, collectionRef: current } as Item}
      onClose={() => dataFinderStore.send({ type: 'closeSecondaryPanel' })}
    />
  )
}

const renderCardWithIntegrationTools = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthenticationContext.Provider value={auth}>
          <Theme>
            <ItemCard item={item} type="query-item" />
            <IntegrationToolsHost />
          </Theme>
        </AuthenticationContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const choose = (tool: Parameters<typeof listRecord>[0]) =>
  act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(tool) }))

beforeEach(() => {
  stubBrowserGlobals()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'closeSecondaryPanel' })
  dataFinderStore.send({ type: 'setCollection', collection })
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchToolByIdFromFixtures)
  vi.mocked(fetchItem).mockResolvedValue(item)
})

afterEach(() => {
  dataFinderStore.send({ type: 'clearTool' })
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('ItemCard with no chosen tool', () => {
  it('has no Run or Open in button', () => {
    renderCard()
    expect(screen.queryByRole('button', { name: /^run /i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^open in /i })).toBeNull()
  })
})

describe('ItemCard with a chosen workflow', () => {
  it('has a Run button named after the workflow', () => {
    choose(ndviWorkflow)
    renderCard()
    expect(screen.getByRole('button', { name: 'Run NDVI' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^open in /i })).toBeNull()
  })

  it('opens the Run workflow dialog with the item and the workflow filled in', async () => {
    const user = userEvent.setup()
    choose(ndviWorkflow)
    renderCard()
    await user.click(screen.getByRole('button', { name: 'Run NDVI' }))

    const dialog = await screen.findByRole('dialog')
    expect(await screen.findByRole('heading', { name: /check the inputs/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /choose a workflow/i })).toBeNull()
    expect(dialog).toHaveTextContent('NDVI')
    expect(dialog).toHaveTextContent(item.id)
  })

  it('removes the Run button when the tool is cleared', () => {
    choose(ndviWorkflow)
    renderCard()
    act(() => dataFinderStore.send({ type: 'clearTool' }))
    expect(screen.queryByRole('button', { name: 'Run NDVI' })).toBeNull()
  })
})

describe('ItemCard with a chosen notebook', () => {
  it('has an Open in button named after the notebook', () => {
    choose(itemNotebook)
    renderCard()
    expect(screen.getByRole('button', { name: 'Open in NDVI notebook' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^run /i })).toBeNull()
  })

  it('opens Integration Tools for this item', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    renderCard()
    await user.click(screen.getByRole('button', { name: 'Open in NDVI notebook' }))

    const { secondaryPanel, infoPanelItem } = dataFinderStore.getSnapshot().context
    expect(secondaryPanel).toBe('integration-tools')
    expect(infoPanelItem?.id).toBe(item.id)
  })

  it('returns to the Jupyter tab with the notebook when Open in is clicked again', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    renderCardWithIntegrationTools()
    const openIn = screen.getByRole('button', { name: 'Open in NDVI notebook' })

    await user.click(openIn)
    await user.click(await screen.findByRole('tab', { name: /desktop gis/i }))
    await user.click(openIn)

    expect(screen.getByRole('tab', { name: /jupyter/i })).toHaveAttribute('aria-selected', 'true')
    const jupyter = screen.getByRole('tabpanel')
    expect(jupyter).toHaveTextContent('NDVI notebook')
    expect(within(jupyter).getByRole('button', { name: 'Launch' })).toBeEnabled()
  })

  it('disables the Open in button when signed out', () => {
    choose(itemNotebook)
    renderCard(item, { ...auth, isAuthenticated: false, token: undefined })
    expect(screen.getByRole('button', { name: 'Open in NDVI notebook' })).toBeDisabled()
  })
})

describe('Pinned ItemCard with a chosen tool', () => {
  const pinnedSource = {
    ...item,
    id: 'S2B_20250615',
    links: [{ rel: 'self', type: 'application/json', href: `${ITEM_SELF_HREF}-pinned` }],
  } as unknown as Item

  /** Pins an item the way the result card does and returns it as the Pinned tab holds it. */
  const pinItem = (source: Item) => {
    const { collectionRender } = dataFinderStore.getSnapshot().context
    dataFinderStore.send({
      type: 'addPinnedItem',
      item: source,
      collectionRender: collectionRender!,
      isLicenseProprietary: false,
      isUserCollection: false,
      collectionName: collection.title!,
      collection,
    })
    return dataFinderStore.getSnapshot().context.pinnedItems.find((p) => p.id === source.id)!
  }

  const renderPinnedCard = (authValue: AuthValue = auth) => {
    const pinned = pinItem(pinnedSource)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthenticationContext.Provider value={authValue}>
            <Theme>
              <ItemCard item={pinned} type="pinned-item" />
            </Theme>
          </AuthenticationContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  }

  beforeEach(() => {
    dataFinderStore.send({ type: 'clearAllPinnedItems' })
  })

  afterEach(() => {
    dataFinderStore.send({ type: 'clearAllPinnedItems' })
  })

  it('has no Run or Open in button when no tool is chosen', () => {
    renderPinnedCard()
    expect(screen.queryByRole('button', { name: /^run /i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^open in /i })).toBeNull()
  })

  it('has a Run button named after the chosen workflow', () => {
    choose(ndviWorkflow)
    renderPinnedCard()
    expect(screen.getByRole('button', { name: 'Run NDVI' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^open in /i })).toBeNull()
  })

  it('opens the Run workflow dialog with the pinned item and the workflow filled in', async () => {
    const user = userEvent.setup()
    choose(ndviWorkflow)
    renderPinnedCard()
    await user.click(screen.getByRole('button', { name: 'Run NDVI' }))

    const dialog = await screen.findByRole('dialog')
    expect(await screen.findByRole('heading', { name: /check the inputs/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /choose a workflow/i })).toBeNull()
    expect(dialog).toHaveTextContent('NDVI')
    expect(dialog).toHaveTextContent(pinnedSource.id)
  })

  it('has an Open in button named after the chosen notebook', () => {
    choose(itemNotebook)
    renderPinnedCard()
    expect(screen.getByRole('button', { name: 'Open in NDVI notebook' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^run /i })).toBeNull()
  })

  it('opens Integration Tools for the pinned item', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    renderPinnedCard()
    await user.click(screen.getByRole('button', { name: 'Open in NDVI notebook' }))

    const { secondaryPanel, infoPanelItem } = dataFinderStore.getSnapshot().context
    expect(secondaryPanel).toBe('integration-tools')
    expect(infoPanelItem?.id).toBe(pinnedSource.id)
  })

  it('disables the Open in button when signed out', () => {
    choose(itemNotebook)
    renderPinnedCard({ ...auth, isAuthenticated: false, token: undefined })
    expect(screen.getByRole('button', { name: 'Open in NDVI notebook' })).toBeDisabled()
  })

  it('removes the button when the tool is cleared', () => {
    choose(ndviWorkflow)
    renderPinnedCard()
    act(() => dataFinderStore.send({ type: 'clearTool' }))
    expect(screen.queryByRole('button', { name: 'Run NDVI' })).toBeNull()
  })
})
