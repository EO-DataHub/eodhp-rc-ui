import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Item } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { fetchToolsFromFixtures, ndviWorkflow, stubBrowserGlobals } from '@/test-data/runWorkflow'
import { clearPins, fanOutItems, pinItems, sentinelCollection } from '@/test-data/runWorkflowFanOut'
import {
  chooseTool,
  fetchAnyToolById,
  hideRunPanel,
  renderWithRunPanel,
  runPanel,
} from '@/test-data/runPanel'
import PinnedItemsTab from './PinnedItems'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(),
  fetchWorkspaces: vi.fn(),
}))
vi.mock('@/services/savedSetsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/savedSetsService')>()),
  fetchSavedSets: vi.fn(() => Promise.resolve([])),
  fetchSavedSet: vi.fn(),
}))
// The pinned cards have their own buttons; these tests check the tab's Run workflow button
vi.mock('@/components/ItemCard/ItemCard', () => ({
  default: ({ item }: { item: Item }) => <p>{item.id}</p>,
}))

const openFromPinnedTab = async (user: ReturnType<typeof userEvent.setup>) => {
  await renderWithRunPanel(<PinnedItemsTab />)
  await user.click(screen.getByRole('button', { name: 'Run workflow' }))
  return runPanel()
}

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  hideRunPanel()
  clearPins()
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'setCollection', collection: sentinelCollection })
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchAnyToolById)
  pinItems(fanOutItems(3))
})

afterEach(() => {
  hideRunPanel()
  clearPins()
  dataFinderStore.send({ type: 'clearTool' })
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Stage 3: Pinned Items tab Run workflow opens the run panel', () => {
  it('sets Run on to Pinned items for the chosen workflow, with no dialog', async () => {
    const user = userEvent.setup()
    chooseTool(ndviWorkflow)
    const panel = await openFromPinnedTab(user)

    expect(await within(panel).findByRole('radio', { name: /pinned items/i })).toBeChecked()
    expect(panel).toHaveTextContent(/\b3 jobs\b/i)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens on the tool list with no chosen tool, and keeps Pinned items for the workflow chosen next', async () => {
    const user = userEvent.setup()
    const panel = await openFromPinnedTab(user)
    await within(panel).findByRole('heading', { name: 'Tools for Sentinel-2 ARD' })

    await user.click(await within(panel).findByText('NDVI', { exact: true }))
    expect(await within(panel).findByRole('radio', { name: /pinned items/i })).toBeChecked()
  })
})
