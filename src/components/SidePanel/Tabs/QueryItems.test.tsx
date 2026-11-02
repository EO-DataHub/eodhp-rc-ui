import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Item } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems as fetchCatalogue } from '@/services/processCatalogueService'
import { fetchItems as searchItems } from '@/services/itemService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { PAGE_SIZE } from '@/hooks/useItemsQuery'
import { listRecord, ndviWorkflow, stubBrowserGlobals } from '@/test-data/runWorkflow'
import {
  fanOutItemHref,
  fanOutItems,
  fanOutWorkflows,
  sentinelCollection,
  sentItemLinks,
} from '@/test-data/runWorkflowFanOut'
import { withProviders } from '@/test-data/runWorkflowRender'
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
  render(withProviders(<QueryItemsTab />))
  await user.click(await screen.findByRole('button', { name: 'Run on results' }))
  return screen.findByRole('dialog')
}

const heading = (dialog: HTMLElement, name: RegExp) =>
  within(dialog).findByRole('heading', { name })

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'clearAllPinnedItems' })
  dataFinderStore.send({ type: 'storeAoi', aoi: undefined })
  dataFinderStore.send({ type: 'setCollection', collection: sentinelCollection })
  dataFinderStore.send({ type: 'queryFilterChange', queryFilter: { limit: 100 } })

  vi.mocked(fetchCatalogue).mockResolvedValue({
    data: { items: fanOutWorkflows.map(listRecord) } as never,
    error: null,
  })
  vi.mocked(fetchItemById).mockImplementation((id) =>
    Promise.resolve({
      data: fanOutWorkflows.find((w) => w.id === id)!,
      error: null,
      notFound: false,
    }),
  )
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

describe('Stage 1: Items tab Run on results', () => {
  it('opens the dialog with all results as the source, at the workflow step', async () => {
    const user = userEvent.setup()
    const dialog = await openRunOnResults(user)
    await heading(dialog, /choose a workflow/i)
    expect(
      within(dialog).queryByRole('heading', { name: /what do you want to run on/i }),
    ).toBeNull()
    expect(dialog).toHaveTextContent(/all results/i)
  })

  it("lists only the workflows for the search's dataset and for any dataset", async () => {
    const user = userEvent.setup()
    const dialog = await openRunOnResults(user)
    expect(await within(dialog).findByText('NDVI')).toBeInTheDocument()
    expect(within(dialog).getByText('Footprint')).toBeInTheDocument()
    expect(within(dialog).queryByText('Landsat surface temperature')).toBeNull()
  })

  it('runs one job for every result of the search, not only the page shown', async () => {
    const user = userEvent.setup()
    const dialog = await openRunOnResults(user)
    await heading(dialog, /choose a workflow/i)
    await user.click(await within(dialog).findByText('Footprint'))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await heading(dialog, /review/i)
    expect(dialog).toHaveTextContent(new RegExp(`\\b${results.length} jobs\\b`, 'i'))

    await user.click(within(dialog).getByRole('button', { name: /^run\b/i }))
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(results.length))
    expect(new Set(sentItemLinks(vi.mocked(launchWorkflow).mock.calls))).toEqual(
      new Set(results.map((result) => fanOutItemHref(result.id))),
    )
  })

  it('opens with the workflow chosen in the Data Finder filled in', async () => {
    const user = userEvent.setup()
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    const dialog = await openRunOnResults(user)
    await heading(dialog, /check the inputs/i)
    expect(within(dialog).queryByRole('heading', { name: /choose a workflow/i })).toBeNull()
    expect(dialog).toHaveTextContent('NDVI')
    expect(dialog).toHaveTextContent(/all results/i)
  })
})
