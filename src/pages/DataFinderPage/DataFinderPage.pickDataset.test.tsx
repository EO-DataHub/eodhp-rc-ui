import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Collection } from '@/types'
import { fetchCollections, fetchUserCollections } from '@/services/collectionService'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { catalogs } from '@/constants/catalogs'
import {
  fetchToolByIdFromFixtures,
  fetchToolsFromFixtures,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import dataFinderStore from './useFinderStore'
import { DataFinderPage } from './DataFinderPage'

// Hoisted so the collection hook mock returns the same objects on every render
const { sentinel, landsat, modis } = vi.hoisted(() => {
  const collection = (id: string, title: string) =>
    ({ id, title, description: '', links: [], extent: {} }) as unknown as Collection
  return {
    sentinel: collection('sentinel2_ard', 'Sentinel-2 ARD'),
    landsat: collection('landsat_c2l2', 'Landsat C2 L2'),
    modis: collection('modis_lst', 'MODIS land surface temperature'),
  }
})
const allCollections = [sentinel, landsat, modis]

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
// This file checks the page and the sidebar together; the map and item lists are not needed
vi.mock('@/components/Map/Map', () => ({ Map: () => null }))
vi.mock('@/components/SidePanel/Tabs/QueryItems', () => ({ default: () => <p>Item results</p> }))
vi.mock('@/components/SidePanel/Tabs/PinnedItems', () => ({ default: () => <p>Pinned list</p> }))
vi.mock('@/hooks/useCollectionFromPath', () => {
  const loaded = { isFetched: true, data: [] }
  const results = new Map(
    [sentinel, landsat, modis].map((found) => [
      found.id,
      {
        status: 'found',
        collection: found,
        parsedPath: { type: 'public', collectionId: found.id },
        isUserCollection: false,
        collectionQueries: loaded,
        userCollectionQuery: loaded,
        workspaceTokensData: undefined,
      },
    ]),
  )
  return { useCollectionFromPath: (collectionPath: string) => results.get(collectionPath) }
})

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

const searchParams = () => {
  const location = screen.getByTestId('location').textContent ?? ''
  return new URLSearchParams(location.split('?')[1] ?? '')
}

const renderFinder = (url: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={queryClient}>
        <Theme>
          <Routes>
            <Route
              path="/finder/*"
              element={
                <>
                  <DataFinderPage />
                  <LocationProbe />
                </>
              }
            />
            <Route path="/" element={<LocationProbe />} />
          </Routes>
        </Theme>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const datasetList = () => screen.queryByRole('heading', { name: /data collections/i })
const chosenTool = () => dataFinderStore.getSnapshot().context.chosenTool

beforeEach(() => {
  stubBrowserGlobals()
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'closeSecondaryPanel' })
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchToolByIdFromFixtures)
  vi.mocked(fetchCollections).mockImplementation((catalog) =>
    Promise.resolve(catalog === catalogs[0] ? allCollections : []),
  )
  vi.mocked(fetchUserCollections).mockResolvedValue([])
})

afterEach(() => {
  dataFinderStore.send({ type: 'clearTool' })
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('DataFinderPage pickDataset parameter', () => {
  const pickUrl = '/finder/landsat_c2l2?tool=change-detection&pickDataset=1'

  it("opens the dataset list filtered to the tool's datasets", async () => {
    renderFinder(pickUrl)

    await waitFor(() => {
      expect(chosenTool()?.id).toBe('change-detection')
      expect(datasetList()).toBeInTheDocument()
      expect(screen.getByText('Landsat C2 L2')).toBeInTheDocument()
      expect(screen.getByText('Sentinel-2 ARD')).toBeInTheDocument()
      expect(screen.queryByText('MODIS land surface temperature')).toBeNull()
    })
  })

  it('removes pickDataset from the URL and keeps the tool', async () => {
    renderFinder(pickUrl)

    await waitFor(() => expect(datasetList()).toBeInTheDocument())
    await waitFor(() => expect(searchParams().has('pickDataset')).toBe(false))
    expect(searchParams().get('tool')).toBe('change-detection')
    expect(screen.getByTestId('location')).toHaveTextContent('/finder/landsat_c2l2')
  })

  it('does not open the dataset list when the URL has no pickDataset', async () => {
    renderFinder('/finder/landsat_c2l2?tool=change-detection')

    await waitFor(() => expect(chosenTool()?.id).toBe('change-detection'))
    expect(await screen.findByText('Item results')).toBeInTheDocument()
    expect(datasetList()).toBeNull()
  })
})
