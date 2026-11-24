import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchCollectionByUrl, fetchItemByUrl } from '@/services/itemService'
import { fetchWorkspaces, fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchWorkspaceAdmins } from '@/services/workspaceMembersService'
import { fetchSavedSet, fetchSavedSets } from '@/services/savedSetsService'
import { stubBrowserGlobals } from '@/test-data/runWorkflow'
import {
  clearPins,
  fanOutItem,
  savedSet,
  sentinelCollection,
  setItem,
  stubPointerApis,
  summaryOf,
} from '@/test-data/runWorkflowFanOut'
import { withProviders } from '@/test-data/runWorkflowRender'
import { SavedSetDetailPage } from './SavedSetDetailPage'

vi.mock('@/services/itemService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/itemService')>()),
  fetchItemByUrl: vi.fn(),
  fetchCollectionByUrl: vi.fn(),
}))
vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(),
  fetchWorkspaces: vi.fn(),
}))
vi.mock('@/services/workspaceMembersService', () => ({ fetchWorkspaceAdmins: vi.fn() }))
vi.mock('@/services/savedSetsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/savedSetsService')>()),
  fetchSavedSets: vi.fn(),
  fetchSavedSet: vi.fn(),
}))

const COLLECTION_HREF =
  'https://hub.example/api/catalogue/stac/catalogs/public/collections/sentinel2_ard'

const set = savedSet([setItem('S2A_SET_1'), setItem('S2A_SET_2'), setItem('S2A_SET_3')])

/** Shows where the router went, standing in for the Data Finder page. */
const DataFinderStandIn = () => <p data-testid="finder-location">{useLocation().pathname}</p>

const renderSetPage = () =>
  render(
    withProviders(
      <Routes>
        <Route path="/my-data/saved-sets/:setId" element={<SavedSetDetailPage />} />
        <Route path="/finder/*" element={<DataFinderStandIn />} />
      </Routes>,
      { url: `/my-data/saved-sets/${set.id}` },
    ),
  )

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  stubPointerApis()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  clearPins()
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'hideRunPanel' })

  vi.mocked(fetchSavedSet).mockResolvedValue(set)
  vi.mocked(fetchSavedSets).mockResolvedValue([summaryOf(set)])
  vi.mocked(fetchWorkspaces).mockResolvedValue([] as never)
  vi.mocked(fetchWorkspaceAdmins).mockResolvedValue([] as never)
  vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as never)
  vi.mocked(fetchItemByUrl).mockImplementation(({ itemUrl }) =>
    Promise.resolve(
      fanOutItem(String(itemUrl).split('/').pop()!, {
        links: [{ rel: 'collection', href: COLLECTION_HREF }],
      } as never),
    ),
  )
  vi.mocked(fetchCollectionByUrl).mockResolvedValue(sentinelCollection)
})

afterEach(() => {
  clearPins()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Stage 7: Saved set page Run workflow', () => {
  it('opens the set on the map in the Data Finder, with the run panel open on that saved set', async () => {
    const user = userEvent.setup()
    renderSetPage()

    await user.click(await screen.findByRole('button', { name: 'Run workflow' }))

    expect(await screen.findByTestId('finder-location')).toHaveTextContent(/^\/finder\//)
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() =>
      expect(dataFinderStore.getSnapshot().context).toMatchObject({
        isRunPanelOpen: true,
        runSource: 'set',
        runSetId: set.id,
      }),
    )
    expect(dataFinderStore.getSnapshot().context.pinnedItems.map((pinned) => pinned.id)).toEqual([
      'S2A_SET_1',
      'S2A_SET_2',
      'S2A_SET_3',
    ])
  })
})
