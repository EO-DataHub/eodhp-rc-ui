import React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById } from '@/services/processCatalogueService'
import { fetchItems as searchItems } from '@/services/itemService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchSavedSets } from '@/services/savedSetsService'
import { PAGE_SIZE } from '@/hooks/useItemsQuery'
import { anyDatasetWorkflow, item, ndviWorkflow, stubBrowserGlobals } from '@/test-data/runWorkflow'
import {
  clearPins,
  fanOutItem,
  fanOutItemHref,
  fanOutItems,
  pinItems,
  savedSet,
  sentinelCollection,
  sentItemLinks,
  setItem,
  summaryOf,
  workspaceCollection,
} from '@/test-data/runWorkflowFanOut'
import { withProviders } from '@/test-data/runWorkflowRender'
import { fetchAnyToolById } from '@/test-data/runPanel'
import { useWorkflowRun } from './useWorkflowRun'

// Small limits, so the tests need few items and show the hook reads them from the config module
const limits = vi.hoisted(() => ({ CONFIRM_JOBS_ABOVE: 12, MAX_JOBS_PER_RUN: 20 }))
vi.mock('@/constants/workflowRunLimits', () => limits)
const { CONFIRM_JOBS_ABOVE, MAX_JOBS_PER_RUN } = limits

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
  fetchSavedSets: vi.fn(),
  fetchSavedSet: vi.fn(),
}))

type Options = Parameters<typeof useWorkflowRun>[0]

const renderRun = (options: Options) =>
  renderHook(() => useWorkflowRun(options), {
    wrapper: ({ children }: { children: React.ReactNode }) => withProviders(children),
  })

const ids = (items: { id: string }[] | undefined) => items?.map((entry) => entry.id)

const results = fanOutItems(PAGE_SIZE + 1, 'S2A_RESULT')
const set = savedSet([setItem('S2A_SET_1'), setItem('S2A_SET_2'), setItem('S2A_SET_3')])

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  clearPins()
  dataFinderStore.send({ type: 'storeAoi', aoi: undefined })
  dataFinderStore.send({ type: 'setCollection', collection: sentinelCollection })
  dataFinderStore.send({ type: 'queryFilterChange', queryFilter: { limit: 100 } })

  vi.mocked(fetchItemById).mockImplementation(fetchAnyToolById)
  vi.mocked(searchItems).mockResolvedValue(results)
  vi.mocked(fetchSavedSets).mockResolvedValue([summaryOf(set)])
  vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as never)
  let jobNumber = 0
  vi.mocked(launchWorkflow).mockImplementation(() => {
    jobNumber += 1
    return Promise.resolve({
      workflowId: `job-${jobNumber}`,
      status: 'accepted',
      submittedAt: '2026-11-02T10:00:00Z',
    })
  })
})

afterEach(() => {
  clearPins()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Stage 1: useWorkflowRun', () => {
  it('resolves the items and the job count for each source', async () => {
    const pinned = fanOutItems(3, 'S2A_PIN')
    pinItems(pinned)
    const { result } = renderRun({ workflow: ndviWorkflow, item, savedSet: set, source: 'item' })

    expect(ids(result.current.items)).toEqual([item.id])
    expect(result.current.jobCount).toBe(1)

    act(() => result.current.setSource('pinned'))
    expect(ids(result.current.items)).toEqual(ids(pinned))
    expect(result.current.jobCount).toBe(3)

    act(() => result.current.setSource('set'))
    await waitFor(() =>
      expect(ids(result.current.items)).toEqual(['S2A_SET_1', 'S2A_SET_2', 'S2A_SET_3']),
    )
    expect(result.current.jobCount).toBe(3)

    act(() => result.current.setSource('results'))
    await waitFor(() => expect(ids(result.current.items)).toEqual(ids(results)))
    expect(result.current.jobCount).toBe(results.length)
  })

  it('asks for confirmation above the confirmation threshold and blocks above the ceiling', async () => {
    pinItems(fanOutItems(CONFIRM_JOBS_ABOVE, 'S2A_A'))
    const { result } = renderRun({ workflow: ndviWorkflow, source: 'pinned' })
    await waitFor(() => expect(result.current.canRun).toBe(true))
    expect(result.current.needsConfirmation).toBe(false)

    act(() => pinItems([fanOutItem('S2A_ONE_MORE')]))
    expect(result.current.needsConfirmation).toBe(true)
    expect(result.current.canRun).toBe(false)
    act(() => result.current.setConfirmed(true))
    expect(result.current.canRun).toBe(true)

    act(() => pinItems(fanOutItems(MAX_JOBS_PER_RUN - CONFIRM_JOBS_ABOVE, 'S2A_B')))
    expect(result.current.jobCount).toBe(MAX_JOBS_PER_RUN + 1)
    expect(result.current.aboveCeiling).toBe(true)
    expect(result.current.canRun).toBe(false)
  })

  it('blocks a run on private items for a workflow that reads items by link', async () => {
    pinItems([fanOutItem('S2A_PUBLIC')])
    pinItems(
      [
        fanOutItem('PRIVATE_1', { collection: 'purchased_s2' }),
        fanOutItem('PRIVATE_2', { collection: 'purchased_s2' }),
      ],
      { isUserCollection: true, collection: workspaceCollection },
    )
    const { result } = renderRun({ workflow: anyDatasetWorkflow, source: 'pinned' })

    await waitFor(() => expect(result.current.privateItemCount).toBe(2))
    expect(result.current.canRun).toBe(false)
  })

  it('retries only the items whose jobs failed to start', async () => {
    const items = fanOutItems(3, 'S2A_RETRY')
    pinItems(items)
    vi.mocked(launchWorkflow).mockImplementation((_url, variables) =>
      String(variables.stac_item).endsWith('S2A_RETRY_2')
        ? Promise.reject(new Error('Service unavailable'))
        : Promise.resolve({ workflowId: 'job-ok', status: 'accepted', submittedAt: '' }),
    )
    const { result } = renderRun({ workflow: ndviWorkflow, source: 'pinned' })
    await waitFor(() => expect(result.current.canRun).toBe(true))

    await act(() => result.current.run())
    expect(result.current.startedJobs).toHaveLength(2)
    expect(result.current.failedJobs.map((job) => job.item.id)).toEqual(['S2A_RETRY_2'])

    vi.mocked(launchWorkflow).mockClear()
    vi.mocked(launchWorkflow).mockResolvedValue({
      workflowId: 'job-retried',
      status: 'accepted',
      submittedAt: '',
    })
    await act(() => result.current.retryFailed())

    expect(sentItemLinks(vi.mocked(launchWorkflow).mock.calls)).toEqual([
      fanOutItemHref('S2A_RETRY_2'),
    ])
    expect(result.current.failedJobs).toEqual([])
    expect(result.current.startedJobs).toHaveLength(3)
  })
})
