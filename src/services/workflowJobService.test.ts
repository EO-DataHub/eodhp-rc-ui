import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchCalledJobs,
  fetchJobsForWorkspace,
  getNextCalledJobsAfter,
  getNextJobsSkip,
} from './workflowJobService'
import { fetchWorkspaceTokens } from './workspaceTokenService'

vi.mock('./workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(),
}))

const jobsBody = JSON.stringify({ jobs: [], links: [], numberTotal: 0 })

beforeEach(() => {
  // setupTests.ts stubs URL for createObjectURL; these tests need the real constructor.
  vi.unstubAllGlobals()
})

const requestedUrl = (calls: unknown[][]): URL => new URL(String(calls[0][0]), 'http://localhost')

describe('getNextJobsSkip', () => {
  it('returns the skip value of the next link', () => {
    expect(
      getNextJobsSkip([
        { rel: 'self', href: 'https://hub.example/jobs' },
        { rel: 'next', href: 'https://hub.example/jobs?limit=20&skip=40' },
      ]),
    ).toBe(40)
  })

  it('reads a relative next link', () => {
    expect(getNextJobsSkip([{ rel: 'next', href: '/jobs?limit=20&skip=20' }])).toBe(20)
  })

  it.each([
    ['no next link', [{ rel: 'self', href: 'https://hub.example/jobs' }]],
    ['no skip', [{ rel: 'next', href: 'https://hub.example/jobs?limit=20' }]],
    ['skip of 0', [{ rel: 'next', href: 'https://hub.example/jobs?limit=20&skip=0' }]],
    ['a skip that is not a number', [{ rel: 'next', href: 'https://hub.example/jobs?skip=x' }]],
    ['an empty href', [{ rel: 'next', href: '' }]],
  ])('returns undefined for %s', (_, links) => {
    expect(getNextJobsSkip(links)).toBeUndefined()
  })
})

describe('fetchJobsForWorkspace', () => {
  beforeEach(() => {
    vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as Awaited<
      ReturnType<typeof fetchWorkspaceTokens>
    >)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks for one page when limit and skip are given', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(jobsBody))

    await fetchJobsForWorkspace('ws1', 'token', { limit: 20, skip: 40 })

    const url = requestedUrl(fetchSpy.mock.calls)
    expect(url.pathname).toMatch(/\/catalogs\/user\/catalogs\/ws1\/jobs$/)
    expect(url.searchParams.get('limit')).toBe('20')
    expect(url.searchParams.get('skip')).toBe('40')
  })

  it('asks for all jobs when no options are given', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(jobsBody))

    await fetchJobsForWorkspace('ws1', 'token')

    expect(requestedUrl(fetchSpy.mock.calls).search).toBe('')
  })

  it('leaves out a skip of 0 for the first page', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(jobsBody))

    await fetchJobsForWorkspace('ws1', 'token', { limit: 20, skip: 0 })

    const url = requestedUrl(fetchSpy.mock.calls)
    expect(url.searchParams.get('limit')).toBe('20')
    expect(url.searchParams.has('skip')).toBe(false)
  })

  it('sends the workspace-scoped token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(jobsBody))

    await fetchJobsForWorkspace('ws1', 'token', { limit: 20 })

    const init = fetchSpy.mock.calls[0][1]!
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ws-token')
  })
})

describe('getNextCalledJobsAfter', () => {
  it('returns the after value of the next link', () => {
    expect(
      getNextCalledJobsAfter([
        { rel: 'self', href: 'https://hub.example/jobs?scope=called&limit=20' },
        {
          rel: 'next',
          href: 'https://hub.example/jobs?scope=called&limit=20&after=8235000000001/publisher/job-3',
        },
      ]),
    ).toBe('8235000000001/publisher/job-3')
  })

  it('reads an encoded after value', () => {
    expect(
      getNextCalledJobsAfter([
        { rel: 'next', href: '/jobs?scope=called&after=8235000000001%2Fpublisher%2Fjob-3' },
      ]),
    ).toBe('8235000000001/publisher/job-3')
  })

  it.each([
    ['no next link', [{ rel: 'self', href: 'https://hub.example/jobs?scope=called' }]],
    ['no after', [{ rel: 'next', href: 'https://hub.example/jobs?scope=called&limit=20' }]],
    ['an after that is not a cursor', [{ rel: 'next', href: '/jobs?after=job-3' }]],
    ['an after with an extra part', [{ rel: 'next', href: '/jobs?after=8235000000001/a/b/c' }]],
    ['an empty href', [{ rel: 'next', href: '' }]],
  ])('returns undefined for %s', (_, links) => {
    expect(getNextCalledJobsAfter(links)).toBeUndefined()
  })
})

describe('fetchCalledJobs', () => {
  beforeEach(() => {
    vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as Awaited<
      ReturnType<typeof fetchWorkspaceTokens>
    >)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks for the first page of jobs started in other workspaces', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(jobsBody))

    await fetchCalledJobs('ws1', 'token')

    const url = requestedUrl(fetchSpy.mock.calls)
    expect(url.pathname).toMatch(/\/catalogs\/user\/catalogs\/ws1\/jobs$/)
    expect(url.searchParams.get('scope')).toBe('called')
    expect(url.searchParams.get('limit')).toBe('20')
    expect(url.searchParams.has('after')).toBe(false)
    expect(url.searchParams.has('skip')).toBe(false)
  })

  it('continues after the given cursor', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(jobsBody))

    await fetchCalledJobs('ws1', 'token', '8235000000001/publisher/job-3')

    const url = requestedUrl(fetchSpy.mock.calls)
    expect(url.searchParams.get('after')).toBe('8235000000001/publisher/job-3')
  })

  it('sends the workspace-scoped token of the calling workspace', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(jobsBody))

    await fetchCalledJobs('ws1', 'token')

    expect(fetchWorkspaceTokens).toHaveBeenCalledWith('ws1', 'token')
    const init = fetchSpy.mock.calls[0][1]!
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ws-token')
  })
})
