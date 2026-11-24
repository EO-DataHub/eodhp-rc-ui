import React from 'react'
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
import { fetchToolsFromFixtures } from '@/test-data/runWorkflow'
import { fetchAnyToolById, jobsResponse, queryRunPanel } from '@/test-data/runPanel'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { fetchJobsForSharedWorkspace, fetchJobsForWorkspace } from '@/services/workflowJobService'
import { DataFinderPage } from '@/pages/DataFinderPage/DataFinderPage'
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
vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowJobService', () => ({
  fetchJobsForWorkspace: vi.fn(),
  fetchJobsForSharedWorkspace: vi.fn(),
  fetchJobById: vi.fn(),
}))
vi.mock('@/hooks/useGoogleAnalyticsActions', () => ({
  useAnalyticsActions: () => ({
    trackCollectionVisualization: vi.fn(),
    trackItemVisualization: vi.fn(),
  }),
}))
// The Data Finder renders for real, without its map, item lists and collection lookup
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
vi.mock('@/services/workspaceMembersService', () => ({ fetchWorkspaceAdmins: vi.fn() }))
vi.mock('@/services/savedSetsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/savedSetsService')>()),
  fetchSavedSets: vi.fn(),
  fetchSavedSet: vi.fn(),
}))

const COLLECTION_HREF =
  'https://hub.example/api/catalogue/stac/catalogs/public/collections/sentinel2_ard'

const set = savedSet([setItem('S2A_SET_1'), setItem('S2A_SET_2'), setItem('S2A_SET_3')])

/** Shows where the router went. */
const FinderLocation = () => <p data-testid="finder-location">{useLocation().pathname}</p>

/** Renders as main.tsx does, in strict mode, which mounts, unmounts and remounts each page. */
const renderSetPage = () =>
  render(
    <React.StrictMode>
      {withProviders(
        <Routes>
          <Route path="/my-data/saved-sets/:setId" element={<SavedSetDetailPage />} />
          <Route
            path="/finder/*"
            element={
              <>
                <DataFinderPage />
                <FinderLocation />
              </>
            }
          />
        </Routes>,
        { url: `/my-data/saved-sets/${set.id}` },
      )}
    </React.StrictMode>,
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
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchAnyToolById)
  vi.mocked(fetchJobsForWorkspace).mockResolvedValue(jobsResponse([]))
  vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(jobsResponse([]))
})

afterEach(() => {
  clearPins()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Saved set page Run workflow', () => {
  it('opens the set on the map in the Data Finder, with the run panel open on that saved set', async () => {
    const user = userEvent.setup()
    renderSetPage()

    await user.click(await screen.findByRole('button', { name: 'Run workflow' }))

    expect(await screen.findByTestId('finder-location')).toHaveTextContent(/^\/finder\//)
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(queryRunPanel()).toBeVisible())
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
