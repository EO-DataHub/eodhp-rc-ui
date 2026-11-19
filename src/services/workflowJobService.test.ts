import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchJobsForWorkspace, getNextJobsSkip } from './workflowJobService'
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
