import React, { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById } from '@/services/processCatalogueService'
import { fetchItems as searchItems } from '@/services/itemService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchSavedSet, fetchSavedSets } from '@/services/savedSetsService'
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
import { useWorkflowRun, type RunSource } from './useWorkflowRun'

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

type Options = Omit<
  Parameters<typeof useWorkflowRun>[0],
  'source' | 'onSourceChange' | 'setId' | 'onSetIdChange'
> & { source: RunSource; setId?: string | null }

/**
 * Renders the hook with the source and saved set held outside it, as the run panel holds them in
 * the store. `setSource` and `setSetId` change them as the Run on choices do.
 */
const renderRun = ({ source: initialSource, setId: initialSetId = null, ...options }: Options) =>
  renderHook(
    () => {
      const [source, setSource] = useState<RunSource>(initialSource)
      const [setId, setSetId] = useState<string | null>(initialSetId)
      const run = useWorkflowRun({
        ...options,
        source,
        onSourceChange: setSource,
        setId,
        onSetIdChange: setSetId,
      })
      return Object.assign(run, { setSource, setSetId })
    },
    {
      wrapper: ({ children }: { children: React.ReactNode }) => withProviders(children),
    },
  )

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
  vi.mocked(fetchSavedSet).mockResolvedValue(set)
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

describe('useWorkflowRun', () => {
  it('resolves the items and the job count for each source', async () => {
    const pinned = fanOutItems(3, 'S2A_PIN')
    pinItems(pinned)
    const { result } = renderRun({ workflow: ndviWorkflow, item, setId: set.id, source: 'item' })

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

  it('asks for confirmation above the confirmation threshold, allows the ceiling and blocks above it', async () => {
    pinItems(fanOutItems(CONFIRM_JOBS_ABOVE, 'S2A_A'))
    const { result } = renderRun({ workflow: ndviWorkflow, source: 'pinned' })
    await waitFor(() => expect(result.current.canRun).toBe(true))
    expect(result.current.needsConfirmation).toBe(false)

    act(() => pinItems([fanOutItem('S2A_ONE_MORE')]))
    expect(result.current.needsConfirmation).toBe(true)
    expect(result.current.canRun).toBe(false)
    act(() => result.current.setConfirmed(true))
    expect(result.current.canRun).toBe(true)

    act(() => pinItems(fanOutItems(MAX_JOBS_PER_RUN - CONFIRM_JOBS_ABOVE - 1, 'S2A_B')))
    expect(result.current.jobCount).toBe(MAX_JOBS_PER_RUN)
    expect(result.current.aboveCeiling).toBe(false)
    act(() => result.current.setConfirmed(true))
    expect(result.current.canRun).toBe(true)

    act(() => pinItems([fanOutItem('S2A_OVER')]))
    expect(result.current.jobCount).toBe(MAX_JOBS_PER_RUN + 1)
    expect(result.current.aboveCeiling).toBe(true)
    expect(result.current.canRun).toBe(false)
  })

  it('blocks a run on private items for a workflow that reads items by link, not one that stages them in', async () => {
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

    // A workflow that stages the items in can read them
    const { result: stagedIn } = renderRun({ workflow: ndviWorkflow, source: 'pinned' })
    await waitFor(() => expect(stagedIn.current.canRun).toBe(true))
    expect(stagedIn.current.privateItemCount).toBe(0)
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

describe('useWorkflowRun jobs started', () => {
  it('passes only the newly started jobs to onJobsStarted, from the run and from a retry', async () => {
    pinItems(fanOutItems(3, 'S2A_NEW'))
    let failOnce = true
    vi.mocked(launchWorkflow).mockImplementation((_url, variables) => {
      if (String(variables.stac_item).endsWith('S2A_NEW_2') && failOnce) {
        failOnce = false
        return Promise.reject(new Error('Service unavailable'))
      }
      return Promise.resolve({
        workflowId: `job-${String(variables.stac_item).split('/').pop()}`,
        status: 'accepted',
        submittedAt: '',
      })
    })
    const onJobsStarted = vi.fn()
    const { result } = renderRun({ workflow: ndviWorkflow, source: 'pinned', onJobsStarted })
    await waitFor(() => expect(result.current.canRun).toBe(true))

    await act(() => result.current.run())
    expect(onJobsStarted).toHaveBeenCalledTimes(1)
    const [firstJobs] = onJobsStarted.mock.calls[0] as [{ item: { id: string } }[]]
    expect(new Set(ids(firstJobs.map((job) => job.item)))).toEqual(
      new Set(['S2A_NEW_1', 'S2A_NEW_3']),
    )

    await act(() => result.current.retryFailed())
    expect(onJobsStarted).toHaveBeenCalledTimes(2)
    const [retriedJobs] = onJobsStarted.mock.calls[1] as [{ item: { id: string } }[]]
    expect(ids(retriedJobs.map((job) => job.item))).toEqual(['S2A_NEW_2'])
  })
})
