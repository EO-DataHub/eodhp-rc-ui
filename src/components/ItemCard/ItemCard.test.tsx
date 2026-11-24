import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@radix-ui/themes'
import type { Collection, Item } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { fetchItem } from '@/services/itemService'
import {
  anyDatasetWorkflow,
  fetchToolByIdFromFixtures,
  fetchToolsFromFixtures,
  ITEM_SELF_HREF,
  item,
  itemNotebook,
  landsatWorkflow,
  listRecord,
  multiDatasetWorkflow,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import { hideRunPanel, renderWithRunPanel, runPanel, sourceRadio } from '@/test-data/runPanel'
import { getAvailableRenders } from '@/library/integrationTools'
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

/** Pins an item from the open dataset and returns it as the Pinned tab holds it. */
const pinCard = (source: Item) => {
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

const choose = (tool: Parameters<typeof listRecord>[0]) =>
  act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(tool) }))

beforeEach(() => {
  stubBrowserGlobals()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  hideRunPanel()
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

  it('has an Open in button named after the chosen notebook', () => {
    choose(itemNotebook)
    renderPinnedCard()
    expect(screen.getByRole('button', { name: 'Open in NDVI notebook' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^run /i })).toBeNull()
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

describe('ItemCard Run button opens the run panel', () => {
  beforeEach(() => {
    dataFinderStore.send({ type: 'clearAllPinnedItems' })
  })

  it('sets Run on to this result and opens the run panel, with no dialog', async () => {
    const user = userEvent.setup()
    choose(ndviWorkflow)
    await renderWithRunPanel(<ItemCard item={item} type="query-item" />)
    await user.click(screen.getByRole('button', { name: 'Run NDVI' }))

    const panel = await runPanel()
    expect(sourceRadio(panel, /this item/i)).toBeChecked()
    expect(panel).toHaveTextContent(item.id)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sets Run on to this pinned item and opens the run panel, with no dialog', async () => {
    const user = userEvent.setup()
    const pinned = pinCard({ ...item, id: 'S2B_PINNED' } as Item)
    choose(ndviWorkflow)
    await renderWithRunPanel(<ItemCard item={pinned} type="pinned-item" />)
    await user.click(screen.getByRole('button', { name: 'Run NDVI' }))

    const panel = await runPanel()
    expect(sourceRadio(panel, /this item/i)).toBeChecked()
    expect(panel).toHaveTextContent('S2B_PINNED')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ItemCard Open in button sets the item in the run panel', () => {
  it('opens the run panel on the notebook with this item, not Integration Tools', async () => {
    const user = userEvent.setup()
    choose(itemNotebook)
    await renderWithRunPanel(<ItemCard item={item} type="query-item" />)
    await user.click(screen.getByRole('button', { name: 'Open in NDVI notebook' }))

    const panel = await runPanel()
    expect(panel).toHaveTextContent('NDVI notebook')
    expect(panel).toHaveTextContent(item.id)
    expect(within(panel).getByRole('button', { name: 'Launch' })).toBeEnabled()
    expect(dataFinderStore.getSnapshot().context.secondaryPanel).toBeUndefined()
  })
})

describe('ItemCard tool buttons for the datasets the tool applies to', () => {
  const landsat = {
    id: 'landsat_c2l2',
    title: 'Landsat C2 L2',
    links: [],
  } as unknown as Collection

  const landsatItem = {
    ...item,
    id: 'LC09_20250610',
    collection: 'landsat_c2l2',
    links: [{ rel: 'self', type: 'application/json', href: `${ITEM_SELF_HREF}-landsat` }],
  } as unknown as Item

  // Has renders, so Open in can show; the notebook does not list it
  const sentinel1 = {
    id: 'sentinel1_ard',
    title: 'Sentinel-1 ARD',
    links: [],
  } as unknown as Collection

  const sentinel1Item = {
    ...item,
    id: 'S1A_20250610',
    collection: 'sentinel1_ard',
    render: { id: getAvailableRenders('sentinel1_ard')[0].id },
    links: [{ rel: 'self', type: 'application/json', href: `${ITEM_SELF_HREF}-s1` }],
  } as unknown as Item

  const anyDatasetNotebook = {
    ...itemNotebook,
    id: 'any_notebook',
    properties: {
      ...itemNotebook.properties,
      title: 'Any dataset notebook',
      applicableCollections: undefined,
    },
  }

  const renderCardOfType = (cardItem: Item, type: 'query-item' | 'pinned-item') => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthenticationContext.Provider value={auth}>
            <Theme>
              <ItemCard item={cardItem} type={type} />
            </Theme>
          </AuthenticationContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  }

  /** Pins an item while its own dataset is open, then opens another dataset. */
  const pinFrom = (source: Item, from: Collection, thenOpen: Collection) => {
    dataFinderStore.send({ type: 'setCollection', collection: from })
    const { collectionRender } = dataFinderStore.getSnapshot().context
    dataFinderStore.send({
      type: 'addPinnedItem',
      item: source,
      collectionRender: collectionRender!,
      isLicenseProprietary: false,
      isUserCollection: false,
      collectionName: from.title!,
      collection: from,
    })
    dataFinderStore.send({ type: 'setCollection', collection: thenOpen })
    return dataFinderStore.getSnapshot().context.pinnedItems.find((p) => p.id === source.id)!
  }

  const openLandsat = () => dataFinderStore.send({ type: 'setCollection', collection: landsat })

  beforeEach(() => {
    dataFinderStore.send({ type: 'clearAllPinnedItems' })
  })

  afterEach(() => {
    dataFinderStore.send({ type: 'clearAllPinnedItems' })
  })

  describe('on a result card', () => {
    it('has no Run button when the workflow does not list the item dataset', () => {
      openLandsat()
      choose(ndviWorkflow)
      renderCardOfType(landsatItem, 'query-item')
      expect(screen.queryByRole('button', { name: 'Run NDVI' })).toBeNull()
      expect(screen.queryByRole('button', { name: /^run /i })).toBeNull()
    })

    it('has no Open in button when the notebook does not list the item dataset', () => {
      dataFinderStore.send({ type: 'setCollection', collection: sentinel1 })
      choose(itemNotebook)
      renderCardOfType(sentinel1Item, 'query-item')
      expect(screen.queryByRole('button', { name: /^open in /i })).toBeNull()
    })

    it('has an Open in button on every card when the notebook lists no datasets', () => {
      choose(anyDatasetNotebook)
      const { unmount } = renderCardOfType(item, 'query-item')
      expect(
        screen.getByRole('button', { name: 'Open in Any dataset notebook' }),
      ).toBeInTheDocument()
      unmount()

      dataFinderStore.send({ type: 'setCollection', collection: sentinel1 })
      renderCardOfType(sentinel1Item, 'query-item')
      expect(
        screen.getByRole('button', { name: 'Open in Any dataset notebook' }),
      ).toBeInTheDocument()
    })

    it('has a Run button when the workflow lists the item dataset', () => {
      openLandsat()
      choose(landsatWorkflow)
      renderCardOfType(landsatItem, 'query-item')
      expect(
        screen.getByRole('button', { name: 'Run Landsat surface temperature' }),
      ).toBeInTheDocument()
    })

    it('has a Run button when the item dataset is one of several the workflow lists', () => {
      openLandsat()
      choose(multiDatasetWorkflow)
      renderCardOfType(landsatItem, 'query-item')
      expect(screen.getByRole('button', { name: 'Run Change detection' })).toBeInTheDocument()
    })

    it('has a Run button on every card when the workflow lists no datasets', () => {
      choose(anyDatasetWorkflow)
      const { unmount } = renderCardOfType(item, 'query-item')
      expect(screen.getByRole('button', { name: 'Run Footprint' })).toBeInTheDocument()
      unmount()

      openLandsat()
      renderCardOfType(landsatItem, 'query-item')
      expect(screen.getByRole('button', { name: 'Run Footprint' })).toBeInTheDocument()
    })
  })

  describe('on a pinned card', () => {
    it('has no Run button when the workflow does not list the pinned item dataset', () => {
      const pinned = pinFrom(landsatItem, landsat, collection)
      choose(ndviWorkflow)
      renderCardOfType(pinned, 'pinned-item')
      expect(screen.queryByRole('button', { name: /^run /i })).toBeNull()
    })

    it('has no Open in button when the notebook does not list the pinned item dataset', () => {
      const pinned = pinFrom(sentinel1Item, sentinel1, collection)
      choose(itemNotebook)
      renderCardOfType(pinned, 'pinned-item')
      expect(screen.queryByRole('button', { name: /^open in /i })).toBeNull()
    })

    it('has an Open in button on a pinned card when the notebook lists no datasets', () => {
      const pinned = pinFrom(sentinel1Item, sentinel1, collection)
      choose(anyDatasetNotebook)
      renderCardOfType(pinned, 'pinned-item')
      expect(
        screen.getByRole('button', { name: 'Open in Any dataset notebook' }),
      ).toBeInTheDocument()
    })

    it('has a Run button when the workflow lists the pinned item dataset, whatever dataset is open', () => {
      const pinned = pinFrom(item, collection, landsat)
      choose(ndviWorkflow)
      renderCardOfType(pinned, 'pinned-item')
      expect(screen.getByRole('button', { name: 'Run NDVI' })).toBeInTheDocument()
    })

    it('has a Run button on every pinned card when the workflow lists no datasets', () => {
      const pinnedSentinel = pinFrom(item, collection, landsat)
      const pinnedLandsat = pinFrom(landsatItem, landsat, collection)
      choose(anyDatasetWorkflow)
      renderCardOfType(pinnedSentinel, 'pinned-item')
      renderCardOfType(pinnedLandsat, 'pinned-item')
      expect(screen.getAllByRole('button', { name: 'Run Footprint' })).toHaveLength(2)
    })
  })
})
