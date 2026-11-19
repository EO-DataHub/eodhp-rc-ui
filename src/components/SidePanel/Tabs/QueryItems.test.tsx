import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Item } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems as fetchCatalogue } from '@/services/processCatalogueService'
import { fetchItems as searchItems } from '@/services/itemService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { PAGE_SIZE } from '@/hooks/useItemsQuery'
import {
  anyDatasetWorkflow,
  fetchToolsFromFixtures,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import {
  fanOutItemHref,
  fanOutItems,
  sentinelCollection,
  sentItemLinks,
} from '@/test-data/runWorkflowFanOut'
import {
  chooseTool,
  fetchAnyToolById,
  hideRunPanel,
  renderWithRunPanel,
  runPanel,
  runWorkflowButton,
} from '@/test-data/runPanel'
import QueryItemsTab from './QueryItems'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(),
  fetchWorkspaces: vi.fn(),
}))
vi.mock('@/services/itemService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/itemService')>()),
  fetchItems: vi.fn(),
}))
vi.mock('@/services/savedSetsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/savedSetsService')>()),
  fetchSavedSets: vi.fn(() => Promise.resolve([])),
  fetchSavedSet: vi.fn(),
}))
// The result cards have their own buttons; these tests check the tab's Run on results button
vi.mock('@/components/ItemCard/ItemCard', () => ({
  default: ({ item }: { item: Item }) => <p>{item.id}</p>,
}))

type User = ReturnType<typeof userEvent.setup>

// More results than one page holds
const results = fanOutItems(PAGE_SIZE + 1, 'S2A_RESULT')

const openRunOnResults = async (user: User) => {
  await renderWithRunPanel(<QueryItemsTab />)
  await user.click(await screen.findByRole('button', { name: 'Run on results' }))
  return runPanel()
}

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  hideRunPanel()
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'clearAllPinnedItems' })
  dataFinderStore.send({ type: 'storeAoi', aoi: undefined })
  dataFinderStore.send({ type: 'setCollection', collection: sentinelCollection })
  dataFinderStore.send({ type: 'queryFilterChange', queryFilter: { limit: 100 } })

  vi.mocked(fetchCatalogue).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchAnyToolById)
  vi.mocked(searchItems).mockResolvedValue(results)
  vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as never)
  vi.mocked(launchWorkflow).mockResolvedValue({
    workflowId: 'job',
    status: 'accepted',
    submittedAt: '2026-11-02T10:00:00Z',
  })
})

afterEach(() => {
  dataFinderStore.send({ type: 'clearTool' })
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Stage 3: Items tab Run on results opens the run panel', () => {
  it('sets Run on to All results for the chosen workflow, with no dialog', async () => {
    const user = userEvent.setup()
    chooseTool(ndviWorkflow)
    const panel = await openRunOnResults(user)

    expect(await within(panel).findByRole('radio', { name: /all results/i })).toBeChecked()
    expect(panel).toHaveTextContent('NDVI')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens on the tool list with no chosen tool, and keeps All results for the workflow chosen next', async () => {
    const user = userEvent.setup()
    const panel = await openRunOnResults(user)
    await within(panel).findByRole('heading', { name: 'Tools for Sentinel-2 ARD' })

    await user.click(await within(panel).findByText('Footprint', { exact: true }))
    expect(await within(panel).findByRole('radio', { name: /all results/i })).toBeChecked()
  })

  it('runs one job for every result of the search, not only the page shown', async () => {
    const user = userEvent.setup()
    chooseTool(anyDatasetWorkflow)
    const panel = await openRunOnResults(user)
    await waitFor(() =>
      expect(panel).toHaveTextContent(new RegExp(`\\b${results.length} jobs\\b`, 'i')),
    )

    await user.click(runWorkflowButton(panel))
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(results.length))
    expect(new Set(sentItemLinks(vi.mocked(launchWorkflow).mock.calls))).toEqual(
      new Set(results.map((result) => fanOutItemHref(result.id))),
    )
  })

  it('does not fetch the results again when the panel opens', async () => {
    const user = userEvent.setup()
    chooseTool(ndviWorkflow)
    const panel = await openRunOnResults(user)
    await within(panel).findByRole('button', { name: 'Run workflow' })
    // Give any refetch time to start
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(searchItems).toHaveBeenCalledTimes(1)
  })
})
