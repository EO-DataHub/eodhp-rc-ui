import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Collection, ProcessDetail } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchCollections, fetchUserCollections } from '@/services/collectionService'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { catalogs } from '@/constants/catalogs'
import {
  anyDatasetWorkflow,
  fetchToolByIdFromFixtures,
  fetchToolsFromFixtures,
  listRecord,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import { SidePanel } from './SidePanel'

vi.mock('@/services/collectionService', () => ({
  fetchCollections: vi.fn(),
  fetchUserCollections: vi.fn(),
  fetchJobCollection: vi.fn(),
}))
vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workspaceTokenService', () => ({ fetchWorkspaceTokens: vi.fn() }))
vi.mock('@/hooks/useGoogleAnalyticsActions', () => ({
  useAnalyticsActions: () => ({ trackCollectionVisualization: vi.fn() }),
}))
// The item lists have their own data hooks; this file checks the tabs around them
vi.mock('@/components/SidePanel/Tabs/QueryItems', () => ({ default: () => <p>Item results</p> }))
vi.mock('@/components/SidePanel/Tabs/PinnedItems', () => ({ default: () => <p>Pinned list</p> }))

const collection = (id: string, title: string) =>
  ({ id, title, description: '', links: [], extent: {} }) as unknown as Collection

const sentinel = collection('sentinel2_ard', 'Sentinel-2 ARD')
const landsat = collection('landsat_c2l2', 'Landsat C2 L2')
const modis = collection('modis_lst', 'MODIS land surface temperature')

const renderSidePanel = (current: Collection = sentinel) => {
  dataFinderStore.send({ type: 'setCollection', collection: current })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SidePanel collection={current} />
        </Theme>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const tab = (name: RegExp) => screen.getByRole('tab', { name })

const choose = (tool: ProcessDetail) =>
  act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(tool) }))

const datasetList = () => screen.queryByRole('heading', { name: /data collections/i })

beforeEach(() => {
  stubBrowserGlobals()
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'closeSecondaryPanel' })
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchToolByIdFromFixtures)
  vi.mocked(fetchCollections).mockImplementation((catalog) =>
    Promise.resolve(catalog === catalogs[0] ? [sentinel, landsat, modis] : []),
  )
  vi.mocked(fetchUserCollections).mockResolvedValue([])
})

afterEach(() => {
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'queryFilterChange', queryFilter: undefined })
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Stage 2: SidePanel tabs', () => {
  it('has only the Items and Pinned Items tabs, and no chosen-tool bar', () => {
    renderSidePanel()
    act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) }))

    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(tab(/^items/i)).toBeInTheDocument()
    expect(tab(/pinned/i)).toBeInTheDocument()
    expect(screen.queryByText(/pick your data/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull()
  })
})

describe('SidePanel dataset list with a chosen tool', () => {
  const openDatasetList = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByText(/change collection/i))
    await waitFor(() => expect(datasetList()).toBeInTheDocument())
  }

  it("shows only the chosen tool's datasets", async () => {
    const user = userEvent.setup()
    renderSidePanel()
    choose(ndviWorkflow)
    await openDatasetList(user)

    expect(await screen.findByText('Sentinel-2 ARD')).toBeInTheDocument()
    expect(screen.queryByText('Landsat C2 L2')).toBeNull()
    expect(screen.queryByText('MODIS land surface temperature')).toBeNull()
  })

  it('shows every dataset when the tool names none', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    choose(anyDatasetWorkflow)
    await openDatasetList(user)

    expect(await screen.findByText('Sentinel-2 ARD')).toBeInTheDocument()
    expect(screen.getByText('Landsat C2 L2')).toBeInTheDocument()
    expect(screen.getByText('MODIS land surface temperature')).toBeInTheDocument()
  })

  it('shows every dataset when no tool is chosen', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await openDatasetList(user)

    expect(await screen.findByText('Sentinel-2 ARD')).toBeInTheDocument()
    expect(screen.getByText('Landsat C2 L2')).toBeInTheDocument()
    expect(screen.getByText('MODIS land surface temperature')).toBeInTheDocument()
  })
})

describe('Stage 3: No run dialog in the Data Finder', () => {
  // Source text of every Data Finder component that had a Run button
  const sources = import.meta.glob(
    [
      '/src/components/SidePanel/**/*.tsx',
      '/src/components/ItemCard/*.tsx',
      '/src/pages/DataFinderPage/*.tsx',
      '!**/*.test.tsx',
    ],
    { query: '?raw', import: 'default', eager: true },
  )

  it('renders RunWorkflowDialog from no Data Finder component', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10)
    const users = Object.entries(sources)
      .filter(([, text]) => String(text).includes('RunWorkflowDialog'))
      .map(([file]) => file)
    expect(users).toEqual([])
  })
})
