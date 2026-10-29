import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import {
  fetchToolByIdFromFixtures,
  fetchToolsFromFixtures,
  listRecord,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import dataFinderStore from './useFinderStore'
import { DataFinderPage } from './DataFinderPage'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
// The map and the sidebar have their own tests; this file checks the page's URL handling
vi.mock('@/components/Map/Map', () => ({ Map: () => null }))
vi.mock('@/components/SidePanel/SidePanel', () => ({ SidePanel: () => null }))
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

const chosenTool = () => dataFinderStore.getSnapshot().context.chosenTool

let navigateTo: (to: string) => void = () => undefined

/** Shows the current query string and lets a test move to another route. */
const LocationProbe = () => {
  const location = useLocation()
  navigateTo = useNavigate()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

const toolParam = () => {
  const location = screen.getByTestId('location').textContent ?? ''
  return new URLSearchParams(location.split('?')[1] ?? '').get('tool')
}

const renderFinder = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
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
    </MemoryRouter>,
  )

beforeEach(() => {
  stubBrowserGlobals()
  dataFinderStore.send({ type: 'clearTool' })
  vi.mocked(fetchItems).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchToolByIdFromFixtures)
})

afterEach(() => {
  dataFinderStore.send({ type: 'clearTool' })
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('DataFinderPage tool parameter', () => {
  it('chooses the tool named in the URL', async () => {
    renderFinder('/finder/sentinel2_ard?tool=ndvi')
    await waitFor(() => expect(chosenTool()?.id).toBe('ndvi'))
    expect(chosenTool()?.properties.title).toBe('NDVI')
  })

  it('ignores an unknown tool id', async () => {
    renderFinder('/finder/sentinel2_ard?tool=no-such-tool')
    // Let the lookup finish before checking nothing was chosen
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    expect(chosenTool()).toBeUndefined()
  })

  it('chooses no tool when the URL names none', async () => {
    renderFinder('/finder/sentinel2_ard')
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    expect(chosenTool()).toBeUndefined()
  })

  it('writes the chosen tool to the URL', async () => {
    renderFinder('/finder/sentinel2_ard')
    act(() => dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) }))
    await waitFor(() => expect(toolParam()).toBe('ndvi'))
    expect(screen.getByTestId('location')).toHaveTextContent('/finder/sentinel2_ard')
  })

  it('removes the tool from the URL when it is cleared', async () => {
    renderFinder('/finder/sentinel2_ard?tool=ndvi')
    await waitFor(() => expect(chosenTool()?.id).toBe('ndvi'))
    act(() => dataFinderStore.send({ type: 'clearTool' }))
    await waitFor(() => expect(toolParam()).toBeNull())
  })

  it('keeps the chosen tool when the user opens another dataset', async () => {
    renderFinder('/finder/sentinel2_ard?tool=ndvi')
    await waitFor(() => expect(chosenTool()?.id).toBe('ndvi'))
    act(() => navigateTo('/finder/landsat_c2l2'))
    await waitFor(() => expect(toolParam()).toBe('ndvi'))
    expect(screen.getByTestId('location')).toHaveTextContent('/finder/landsat_c2l2')
    expect(chosenTool()?.id).toBe('ndvi')
  })

  it('clears the chosen tool when the user leaves the Data Finder', async () => {
    renderFinder('/finder/sentinel2_ard?tool=ndvi')
    await waitFor(() => expect(chosenTool()?.id).toBe('ndvi'))
    act(() => navigateTo('/'))
    expect(chosenTool()).toBeUndefined()
  })

  it('clears the chosen tool when the Data Finder unmounts', async () => {
    const { unmount } = renderFinder('/finder/sentinel2_ard?tool=ndvi')
    await waitFor(() => expect(chosenTool()?.id).toBe('ndvi'))
    unmount()
    expect(chosenTool()).toBeUndefined()
  })
})
