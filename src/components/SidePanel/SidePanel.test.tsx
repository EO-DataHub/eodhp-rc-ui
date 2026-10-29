import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
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
  allWorkflows,
  anyDatasetWorkflow,
  fetchToolByIdFromFixtures,
  fetchToolsFromFixtures,
  itemNotebook,
  listRecord,
  multiDatasetWorkflow,
  ndviWorkflow,
  pinSetNotebook,
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

const chosenTool = () => dataFinderStore.getSnapshot().context.chosenTool

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
const openTab = (user: ReturnType<typeof userEvent.setup>, name: RegExp) => user.click(tab(name))
const activePanel = () => screen.getByRole('tabpanel')

/** The list entry for a tool, found by its exact title. */
const toolEntry = async (title: string) => {
  const titleText = await within(activePanel()).findByText(title, { exact: true })
  const entry = titleText.closest(
    'button, [role="button"], [role="radio"], [role="option"], [role="menuitemradio"]',
  )
  expect(entry).not.toBeNull()
  return entry as HTMLElement
}

const isMarked = (entry: HTMLElement) =>
  ['aria-pressed', 'aria-checked', 'aria-selected'].some(
    (attribute) => entry.getAttribute(attribute) === 'true',
  ) ||
  (entry.getAttribute('aria-current') ?? 'false') !== 'false' ||
  entry.getAttribute('data-state') === 'checked'

const runningBar = (title: string) =>
  screen.queryByText(
    (_, element) =>
      !!element &&
      element.textContent?.trim() === `Running ${title} · pick your data` &&
      Array.from(element.children).every(
        (child) => child.textContent?.trim() !== `Running ${title} · pick your data`,
      ),
  )

const clearButton = () => screen.getByRole('button', { name: /clear/i })

const chooseFromToolsTab = async (
  user: ReturnType<typeof userEvent.setup>,
  tool: ProcessDetail,
) => {
  await openTab(user, /tools/i)
  await user.click(await toolEntry(tool.properties.title))
}

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

describe('SidePanel tabs', () => {
  it('has the Items, Pinned and Tools tabs', () => {
    renderSidePanel()
    expect(tab(/^items/i)).toBeInTheDocument()
    expect(tab(/pinned/i)).toBeInTheDocument()
    expect(tab(/tools/i)).toBeInTheDocument()
  })
})

describe('SidePanel Tools tab', () => {
  it('lists every workflow and every item notebook', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await openTab(user, /tools/i)
    for (const tool of [...allWorkflows, multiDatasetWorkflow, itemNotebook]) {
      expect(await toolEntry(tool.properties.title)).toBeInTheDocument()
    }
  })

  it('does not list pin-set notebooks', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await openTab(user, /tools/i)
    await toolEntry(itemNotebook.properties.title)
    expect(within(activePanel()).queryByText(pinSetNotebook.properties.title)).toBeNull()
  })

  it('shows the type and the description of each tool', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await openTab(user, /tools/i)

    const workflow = await toolEntry('NDVI')
    expect(workflow).toHaveTextContent(/workflow/i)
    expect(workflow).toHaveTextContent('Calculates NDVI for one Sentinel-2 item.')

    const notebook = await toolEntry('NDVI notebook')
    expect(notebook).toHaveTextContent(/notebook/i)
    expect(notebook).toHaveTextContent('Explore NDVI for one item in Jupyter.')
  })

  it('chooses a tool and switches to the Items tab', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await chooseFromToolsTab(user, ndviWorkflow)

    expect(chosenTool()?.id).toBe('ndvi')
    await waitFor(() => expect(tab(/^items/i)).toHaveAttribute('aria-selected', 'true'))
    expect(within(activePanel()).getByText('Item results')).toBeInTheDocument()
  })

  it('chooses a notebook', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await chooseFromToolsTab(user, itemNotebook)
    expect(chosenTool()?.id).toBe('ndvi_notebook')
    expect(runningBar('NDVI notebook')).toBeInTheDocument()
  })

  it('marks the chosen tool in the list', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await chooseFromToolsTab(user, ndviWorkflow)
    await openTab(user, /tools/i)

    expect(isMarked(await toolEntry('NDVI'))).toBe(true)
    expect(isMarked(await toolEntry('Clip'))).toBe(false)
    expect(isMarked(await toolEntry('NDVI notebook'))).toBe(false)
  })
})

describe('SidePanel chosen tool bar', () => {
  it('shows no bar when no tool is chosen', () => {
    renderSidePanel()
    expect(runningBar('NDVI')).toBeNull()
  })

  it('shows the chosen tool above the tabs', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await chooseFromToolsTab(user, ndviWorkflow)
    const bar = runningBar('NDVI')
    expect(bar).toBeInTheDocument()
    expect(activePanel()).not.toContainElement(bar)
  })

  it('shows the bar on all three tabs', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) }))

    expect(runningBar('NDVI')).toBeInTheDocument()
    await openTab(user, /pinned/i)
    expect(runningBar('NDVI')).toBeInTheDocument()
    await openTab(user, /tools/i)
    expect(runningBar('NDVI')).toBeInTheDocument()
  })

  it('clears the chosen tool on ×', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) }))

    await user.click(clearButton())
    expect(chosenTool()).toBeUndefined()
    expect(runningBar('NDVI')).toBeNull()
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
    await chooseFromToolsTab(user, ndviWorkflow)
    await openDatasetList(user)

    expect(await screen.findByText('Sentinel-2 ARD')).toBeInTheDocument()
    expect(screen.queryByText('Landsat C2 L2')).toBeNull()
    expect(screen.queryByText('MODIS land surface temperature')).toBeNull()
  })

  it('shows every dataset when the tool names none', async () => {
    const user = userEvent.setup()
    renderSidePanel()
    await chooseFromToolsTab(user, anyDatasetWorkflow)
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

  it('opens the dataset list when the current dataset does not apply', async () => {
    const user = userEvent.setup()
    renderSidePanel(modis)
    await chooseFromToolsTab(user, ndviWorkflow)

    await waitFor(() => expect(datasetList()).toBeInTheDocument())
    expect(await screen.findByText('Sentinel-2 ARD')).toBeInTheDocument()
    expect(screen.queryByText('MODIS land surface temperature')).toBeNull()
  })

  it('stays on the Items tab when the current dataset applies', async () => {
    const user = userEvent.setup()
    renderSidePanel(sentinel)
    await chooseFromToolsTab(user, ndviWorkflow)

    await waitFor(() => expect(tab(/^items/i)).toHaveAttribute('aria-selected', 'true'))
    expect(datasetList()).toBeNull()
  })

  it('keeps the chosen tool when the dataset list opens', async () => {
    const user = userEvent.setup()
    renderSidePanel(landsat)
    await chooseFromToolsTab(user, ndviWorkflow)
    await waitFor(() => expect(datasetList()).toBeInTheDocument())
    expect(chosenTool()?.id).toBe('ndvi')
  })

  const queryFilter = () => dataFinderStore.getSnapshot().context.queryFilter
  const cloudFilter = { op: '<=', args: [{ property: 'eo:cloud_cover' }, 20] }

  it('clears the query filter when a dataset is picked from the list the tool opened', async () => {
    const user = userEvent.setup()
    dataFinderStore.send({ type: 'queryFilterChange', queryFilter: cloudFilter })
    renderSidePanel(modis)
    await chooseFromToolsTab(user, ndviWorkflow)
    await waitFor(() => expect(datasetList()).toBeInTheDocument())

    // NDVI applies only to Sentinel-2 ARD, so its card is the only one in the list
    await screen.findByText('Sentinel-2 ARD')
    await user.click(screen.getByText(/open collection/i))

    expect(queryFilter()).toBeUndefined()
  })

  it('keeps the query filter when the list the tool opened is closed with Back', async () => {
    const user = userEvent.setup()
    dataFinderStore.send({ type: 'queryFilterChange', queryFilter: cloudFilter })
    renderSidePanel(modis)
    await chooseFromToolsTab(user, ndviWorkflow)
    await waitFor(() => expect(datasetList()).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => expect(datasetList()).toBeNull())
    expect(queryFilter()).toEqual(cloudFilter)
  })
})
