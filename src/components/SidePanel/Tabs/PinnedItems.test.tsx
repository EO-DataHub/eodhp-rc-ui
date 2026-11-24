import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Item } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { fetchToolsFromFixtures, stubBrowserGlobals } from '@/test-data/runWorkflow'
import { clearPins, fanOutItems, pinItems, sentinelCollection } from '@/test-data/runWorkflowFanOut'
import {
  fetchAnyToolById,
  hideRunPanel,
  openRunPanel,
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
// The pinned cards have their own buttons; these tests check the tab around them
vi.mock('@/components/ItemCard/ItemCard', () => ({
  default: ({ item }: { item: Item }) => <p>{item.id}</p>,
}))

/** Opens the run panel on Pinned items next to the tab, as the panel's Run on choice does. */
const openOnPinned = async () => {
  await renderWithRunPanel(<PinnedItemsTab />)
  openRunPanel({ source: 'pinned' })
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

describe('Pinned Items tab has no Run button', () => {
  it('shows the pinned items with no Run workflow button', async () => {
    await renderWithRunPanel(<PinnedItemsTab />)
    await screen.findByText('S2A_FAN_1')

    expect(screen.queryByRole('button', { name: /run/i })).toBeNull()
  })
})

describe('Run panel on pinned items next to the Pinned Items tab', () => {
  it('opens on the tool list with no chosen tool, and keeps Pinned items for the workflow chosen next', async () => {
    const user = userEvent.setup()
    const panel = await openOnPinned()
    await within(panel).findByRole('heading', { name: 'Tools for Sentinel-2 ARD' })

    await user.click(await within(panel).findByText('NDVI', { exact: true }))
    expect(await within(panel).findByRole('radio', { name: /pinned items/i })).toBeChecked()
  })
})
