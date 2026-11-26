import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { fetchCalledJobs, fetchJobsForWorkspace } from '@/services/workflowJobService'
import { fetchToolsFromFixtures, stubBrowserGlobals } from '@/test-data/runWorkflow'
import { fanOutItem, sentinelCollection } from '@/test-data/runWorkflowFanOut'
import { withProviders } from '@/test-data/runWorkflowRender'
import {
  fetchAnyToolById,
  hideRunPanel,
  jobsResponse,
  openRunPanel,
  runPanel,
} from '@/test-data/runPanel'
import dataFinderStore from './useFinderStore'
import { DataFinderPage } from './DataFinderPage'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowJobService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/workflowJobService')>()),
  fetchJobsForWorkspace: vi.fn(),
  fetchCalledJobs: vi.fn(),
  fetchJobById: vi.fn(),
}))
vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(() => Promise.resolve({ access: 'ws-token' })),
  fetchWorkspaces: vi.fn(),
}))
vi.mock('@/hooks/useGoogleAnalyticsActions', () => ({
  useAnalyticsActions: () => ({
    trackCollectionVisualization: vi.fn(),
    trackItemVisualization: vi.fn(),
  }),
}))
// The map and the item lists have their own tests; this file checks how the panels stack
vi.mock('@/components/Map/Map', () => ({ Map: () => null }))
vi.mock('@/components/SidePanel/Tabs/QueryItems', () => ({ default: () => <p>Item results</p> }))
vi.mock('@/components/SidePanel/Tabs/PinnedItems', () => ({ default: () => <p>Pinned list</p> }))
vi.mock('@/components/SidePanel/InfoPanel/ItemInfoPanel', () => ({
  ItemInfoPanel: () => <p>Item details</p>,
}))
vi.mock('@/hooks/useCollectionFromPath', () => ({
  useCollectionFromPath: (collectionPath: string) => ({
    status: 'loading',
    parsedPath: { type: 'public', collectionId: collectionPath },
    isUserCollection: false,
    collectionQueries: { isFetched: false, data: [] },
    userCollectionQuery: { isFetched: false, data: [] },
    workspaceTokensData: undefined,
  }),
}))

type User = ReturnType<typeof userEvent.setup>

const renderFinder = () =>
  render(withProviders(<DataFinderPage />, { url: '/finder/sentinel2_ard', path: '/finder/*' }))

/**
 * The run panel says whether it is above the secondary panel (Filter, item info or collection
 * info) through `data-on-top`: "true" when it is on top, "false" when the secondary panel is.
 */
const runPanelOnTop = async () => (await runPanel()).getAttribute('data-on-top')

const openFilter = () =>
  act(() => {
    dataFinderStore.send({ type: 'setSecondaryPanel', panel: 'query-filters' })
  })

const openItemInfo = () =>
  act(() => {
    dataFinderStore.send({ type: 'toggleItemInfoPanel', item: fanOutItem('S2A_INFO') })
  })

/** A pointer press on plain text inside the filter panel, away from its buttons' actions. */
const pressInFilter = (user: User) => user.click(screen.getByText('Reset'))

const pressInRunPanel = async (user: User) => {
  const panel = await runPanel()
  await user.click(
    await within(panel).findByRole('heading', { name: 'Processes for Sentinel-2 ARD' }),
  )
}

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  hideRunPanel()
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'closeSecondaryPanel' })
  dataFinderStore.send({ type: 'setCollection', collection: sentinelCollection })
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchAnyToolById)
  vi.mocked(fetchJobsForWorkspace).mockResolvedValue(jobsResponse([]))
  vi.mocked(fetchCalledJobs).mockResolvedValue(jobsResponse([]))
})

afterEach(() => {
  hideRunPanel()
  dataFinderStore.send({ type: 'closeSecondaryPanel' })
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Run panel and secondary panel stacking', () => {
  it('puts the run panel on top when it opens after the secondary panel', async () => {
    renderFinder()
    openFilter()
    openRunPanel()

    expect(await runPanelOnTop()).toBe('true')
  })

  it.each([
    ['Filter', openFilter],
    ['item info', openItemInfo],
  ])('puts %s on top when it opens after the run panel', async (_name, openSecondary) => {
    renderFinder()
    openRunPanel()
    expect(await runPanelOnTop()).toBe('true')

    openSecondary()
    expect(await runPanelOnTop()).toBe('false')
  })

  it('brings the lower panel to the top when the user clicks in it', async () => {
    const user = userEvent.setup()
    renderFinder()
    openRunPanel()
    openFilter()
    expect(await runPanelOnTop()).toBe('false')

    await pressInRunPanel(user)
    expect(await runPanelOnTop()).toBe('true')

    await pressInFilter(user)
    expect(await runPanelOnTop()).toBe('false')
  })
})
