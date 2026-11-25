import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkflowJob } from '@/types'
import { getJobWorkspaceFromLinks, mergePagedJobLists, pagedListHasMore } from './jobUtils'

const job = (id: string, created: string, links: WorkflowJob['links'] = []): WorkflowJob => ({
  id,
  jobID: id,
  type: 'process',
  processID: 'ndvi-workflow',
  created,
  started: created,
  finished: null,
  updated: created,
  status: 'successful',
  message: '',
  links,
})

const ids = (jobs: WorkflowJob[]) => jobs.map((j) => j.id)

beforeEach(() => {
  // setupTests.ts stubs URL for createObjectURL; these tests need the real constructor.
  vi.unstubAllGlobals()
})

describe('getJobWorkspaceFromLinks', () => {
  it('reads the workspace from the self link', () => {
    const called = job('job-1', '2026-11-25T10:00:00Z', [
      {
        rel: 'related',
        href: 'https://hub.example/api/catalogue/stac/catalogs/user/catalogs/other/jobs/job-1/x.log',
      },
      {
        rel: 'self',
        href: 'https://hub.example/api/catalogue/stac/catalogs/user/catalogs/publisher/jobs/job-1',
      },
    ])

    expect(getJobWorkspaceFromLinks(called)).toBe('publisher')
  })

  it('falls back to another job link when there is no self link', () => {
    const called = job('job-1', '2026-11-25T10:00:00Z', [
      {
        rel: 'related',
        href: '/api/catalogue/stac/catalogs/user/catalogs/publisher/jobs/job-1/x.log',
      },
    ])

    expect(getJobWorkspaceFromLinks(called)).toBe('publisher')
  })

  it('returns undefined when no link names a workspace', () => {
    expect(getJobWorkspaceFromLinks(job('job-1', '2026-11-25T10:00:00Z'))).toBeUndefined()
  })
})

describe('mergePagedJobLists', () => {
  it('shows every job, newest first, when both lists are fully loaded', () => {
    const own = [job('own-2', '2026-11-25T12:00:00Z'), job('own-1', '2026-11-25T09:00:00Z')]
    const called = [job('called-1', '2026-11-25T10:00:00Z')]

    const { jobs, listsToLoad } = mergePagedJobLists([
      { jobs: own, hasMore: false },
      { jobs: called, hasMore: false },
    ])

    expect(ids(jobs)).toEqual(['own-2', 'called-1', 'own-1'])
    expect(listsToLoad).toEqual([])
  })

  it('holds back jobs older than the oldest loaded job of a list with more pages', () => {
    const own = [job('own-2', '2026-11-25T12:00:00Z'), job('own-1', '2026-11-25T08:00:00Z')]
    // Called jobs older than 10:00 have not been loaded yet, so own-1 (08:00) waits
    const called = [
      job('called-2', '2026-11-25T11:00:00Z'),
      job('called-1', '2026-11-25T10:00:00Z'),
    ]

    const { jobs, listsToLoad } = mergePagedJobLists([
      { jobs: own, hasMore: false },
      { jobs: called, hasMore: true },
    ])

    expect(ids(jobs)).toEqual(['own-2', 'called-2', 'called-1'])
    expect(listsToLoad).toEqual([1])
  })

  it('loads the list whose oldest loaded job is the newest when both have more pages', () => {
    const own = [job('own-1', '2026-11-25T11:00:00Z')]
    const called = [job('called-1', '2026-11-25T09:00:00Z')]

    const { jobs, listsToLoad } = mergePagedJobLists([
      { jobs: own, hasMore: true },
      { jobs: called, hasMore: true },
    ])

    expect(ids(jobs)).toEqual(['own-1'])
    expect(listsToLoad).toEqual([0])
  })

  it('loads a list with more pages but no jobs loaded, without holding others back', () => {
    const own = [job('own-1', '2026-11-25T11:00:00Z')]

    const { jobs, listsToLoad } = mergePagedJobLists([
      { jobs: own, hasMore: false },
      { jobs: [], hasMore: true },
    ])

    expect(ids(jobs)).toEqual(['own-1'])
    expect(listsToLoad).toEqual([1])
  })

  it('lists a job that is in both lists once', () => {
    const shared = job('job-1', '2026-11-25T11:00:00Z')

    const { jobs } = mergePagedJobLists([
      { jobs: [shared], hasMore: false },
      { jobs: [{ ...shared }], hasMore: false },
    ])

    expect(ids(jobs)).toEqual(['job-1'])
  })

  it('keeps jobs with no valid created time', () => {
    const { jobs } = mergePagedJobLists([
      {
        jobs: [job('undated', 'not a date'), job('own-1', '2026-11-25T08:00:00Z')],
        hasMore: false,
      },
      { jobs: [job('called-1', '2026-11-25T10:00:00Z')], hasMore: true },
    ])

    expect(ids(jobs)).toContain('undated')
    expect(ids(jobs)).not.toContain('own-1')
  })
})

describe('pagedListHasMore', () => {
  it('stops counting a list whose first page failed', () => {
    expect(pagedListHasMore({ hasNextPage: false, isError: true, hasLoadedPages: false })).toBe(
      false,
    )
  })

  it('keeps counting a list whose later page failed, so Load more can ask again', () => {
    expect(pagedListHasMore({ hasNextPage: true, isError: true, hasLoadedPages: true })).toBe(true)
  })

  it.each([true, false])('follows the next page when there is no error (%s)', (hasNextPage) => {
    expect(pagedListHasMore({ hasNextPage, isError: false, hasLoadedPages: true })).toBe(
      hasNextPage,
    )
  })
})
