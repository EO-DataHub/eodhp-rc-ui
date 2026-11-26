import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchCalledJobs, fetchJobsForWorkspace } from '@/services/workflowJobService'
import { withProviders } from '@/test-data/runWorkflowRender'
import type { VisitJob } from '@/library/runPanelJobs'
import { useRunPanelJobs } from './useRunPanelJobs'

vi.mock('@/services/workflowJobService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/workflowJobService')>()),
  fetchJobsForWorkspace: vi.fn(),
  fetchCalledJobs: vi.fn(),
}))

const emptyList = { jobs: [], links: [], numberTotal: 0 }

const visitJobs = (count: number): VisitJob[] =>
  Array.from({ length: count }, (_, i) => ({
    jobId: `job-${i + 1}`,
    itemId: `item-${i + 1}`,
    workflowId: 'ndvi',
    workflowTitle: 'NDVI',
    startedAt: '2026-11-26T10:00:00Z',
  }))

const Probe = ({ wanted }: { wanted: boolean }) => {
  useRunPanelJobs(wanted)
  return null
}

beforeEach(() => {
  dataFinderStore.send({ type: 'resetRunPanel' })
  vi.mocked(fetchCalledJobs).mockResolvedValue(emptyList)
  vi.mocked(fetchJobsForWorkspace).mockResolvedValue(emptyList)
})

afterEach(() => {
  dataFinderStore.send({ type: 'resetRunPanel' })
  vi.clearAllMocks()
})

describe('useRunPanelJobs', () => {
  it("reads the newest page of each list under the user's workspace", async () => {
    render(withProviders(<Probe wanted />))

    await waitFor(() =>
      expect(fetchCalledJobs).toHaveBeenCalledWith('my-ws', 'token', undefined, 20),
    )
    expect(fetchJobsForWorkspace).toHaveBeenCalledWith('my-ws', 'token', { limit: 20 })
  })

  it('asks for a page big enough for every job started in this visit', async () => {
    dataFinderStore.send({ type: 'addVisitJobs', jobs: visitJobs(37) })

    render(withProviders(<Probe wanted={false} />))

    await waitFor(() =>
      expect(fetchCalledJobs).toHaveBeenCalledWith('my-ws', 'token', undefined, 37),
    )
  })

  it('asks for no more than the API allows', async () => {
    dataFinderStore.send({ type: 'addVisitJobs', jobs: visitJobs(130) })

    render(withProviders(<Probe wanted={false} />))

    await waitFor(() =>
      expect(fetchCalledJobs).toHaveBeenCalledWith('my-ws', 'token', undefined, 100),
    )
  })
})
