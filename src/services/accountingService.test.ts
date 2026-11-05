import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchAllAggregatedWorkspaceUsageData,
  fetchAllHubUsageData,
  fetchAllWorkspaceUsageData,
  fetchWorkspaceSummaries,
  fetchWorkspaceUsageData,
} from './accountingService'

interface FakeResponse {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

const respond = (status: number, body: unknown): FakeResponse => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  json: () => Promise.resolve(body),
})

const fetchMock = vi.fn<[string, RequestInit?], Promise<FakeResponse>>()

const callUrl = (index: number) => String(fetchMock.mock.calls[index][0])
const callPath = (index: number) => callUrl(index).split('?')[0]
const callParams = (index: number) => new URLSearchParams(callUrl(index).split('?')[1] ?? '')
const groupBy = (params: URLSearchParams) =>
  params
    .getAll('group-by')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .sort()

const row = (uuid: string) => ({
  uuid,
  event_start: '2026-10-01T00:00:00Z',
  event_end: '2026-11-01T00:00:00Z',
  item: 'wfcpu',
  user: null,
  workspace: 'ws-alpha',
  quantity: 1,
  credits: '1.00',
})

const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => row(`${prefix}-${index}`))

const limitOf = (url: string) =>
  Number(new URLSearchParams(url.split('?')[1] ?? '').get('limit') ?? 100)

const afterOf = (url: string) => new URLSearchParams(url.split('?')[1] ?? '').get('after')

const START = '2026-09-01T00:00:00.000Z'
const END = '2026-11-01T00:00:00.000Z'

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Stage 1: accounting service query strings', () => {
  describe('fetchWorkspaceUsageData', () => {
    it.each(['week', 'quarter'] as const)('sends time-aggregation=%s', async (type) => {
      fetchMock.mockResolvedValue(respond(200, []))
      await fetchWorkspaceUsageData('ws-alpha', 'tok', { timeAggregation: type })
      expect(callParams(0).get('time-aggregation')).toBe(type)
    })

    it('sends group-by and sku', async () => {
      fetchMock.mockResolvedValue(respond(200, []))
      await fetchWorkspaceUsageData('ws-alpha', 'tok', {
        start: START,
        end: END,
        timeAggregation: 'month',
        groupBy: ['sku'],
        sku: 'wfcpu',
      })
      const params = callParams(0)
      expect(callPath(0)).toMatch(/\/api\/workspaces\/ws-alpha\/accounting\/usage-data$/)
      expect(groupBy(params)).toEqual(['sku'])
      expect(params.get('sku')).toBe('wfcpu')
      expect(params.get('start')).toBe(START)
      expect(params.get('end')).toBe(END)
    })

    it('leaves out filters that are not set or empty', async () => {
      fetchMock.mockResolvedValue(respond(200, []))
      await fetchWorkspaceUsageData('ws-alpha', 'tok', { start: START, end: END, sku: '' })
      expect([...callParams(0).keys()].sort()).toEqual(['end', 'start'])
    })
  })

  describe('fetchAllHubUsageData', () => {
    it('reads the hub-wide usage with the range, aggregation, grouping and token', async () => {
      fetchMock.mockResolvedValue(respond(200, []))
      await fetchAllHubUsageData('tok', {
        start: START,
        end: END,
        timeAggregation: 'month',
        groupBy: ['workspace', 'sku'],
        sku: 'storage',
      })
      const params = callParams(0)
      expect(callPath(0)).toMatch(/\/api\/accounting\/usage-data$/)
      expect(params.get('start')).toBe(START)
      expect(params.get('end')).toBe(END)
      expect(params.get('time-aggregation')).toBe('month')
      expect(groupBy(params)).toEqual(['sku', 'workspace'])
      expect(params.get('sku')).toBe('storage')
      const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer tok')
    })

    it('leaves out the SKU filter when it is not set or empty', async () => {
      fetchMock.mockResolvedValue(respond(200, []))
      await fetchAllHubUsageData('tok', {
        start: START,
        end: END,
        timeAggregation: 'week',
        groupBy: ['workspace', 'sku'],
      })
      await fetchAllHubUsageData('tok', {
        start: START,
        end: END,
        timeAggregation: 'week',
        groupBy: ['workspace', 'sku'],
        sku: '',
      })
      for (const index of [0, 1]) {
        const params = callParams(index)
        expect(params.has('sku')).toBe(false)
        expect(params.has('after')).toBe(false)
        for (const [key, value] of params.entries()) {
          expect(value, `parameter ${key} is empty`).not.toBe('')
        }
      }
    })

    it('follows the after cursor until a short page', async () => {
      fetchMock.mockImplementation((url) => {
        const limit = limitOf(url)
        const after = afterOf(url)
        if (!after) return Promise.resolve(respond(200, rows('a', limit)))
        return Promise.resolve(respond(200, rows('b', 2)))
      })
      const result = await fetchAllHubUsageData('tok', {
        start: START,
        end: END,
        timeAggregation: 'month',
        groupBy: ['workspace', 'sku'],
      })
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const firstLimit = limitOf(callUrl(0))
      expect(afterOf(callUrl(1))).toBe(`a-${firstLimit - 1}`)
      expect(callParams(1).get('start')).toBe(START)
      expect(result).toHaveLength(firstLimit + 2)
    })

    it('stops at a page cap when every page is full', async () => {
      let counter = 0
      fetchMock.mockImplementation((url) => {
        counter += 1
        return Promise.resolve(respond(200, rows(`p${counter}`, limitOf(url))))
      })
      await fetchAllHubUsageData('tok', {
        start: START,
        end: END,
        timeAggregation: 'day',
        groupBy: ['workspace', 'sku'],
      }).catch(() => undefined)
      expect(fetchMock.mock.calls.length).toBeGreaterThan(1)
      expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(1000)
    })

    it('retries the whole fetch once when paging hits a 404', async () => {
      let attempt = 0
      fetchMock.mockImplementation((url) => {
        const after = afterOf(url)
        if (!after) {
          attempt += 1
          return Promise.resolve(respond(200, rows(`attempt${attempt}`, limitOf(url))))
        }
        if (attempt === 1) return Promise.resolve(respond(404, { detail: 'Cursor not found' }))
        return Promise.resolve(respond(200, rows('tail', 1)))
      })
      const result = await fetchAllHubUsageData('tok', {
        start: START,
        end: END,
        timeAggregation: 'month',
        groupBy: ['workspace', 'sku'],
      })
      expect(attempt).toBe(2)
      expect(result.some((event: { uuid: string }) => event.uuid.startsWith('attempt1'))).toBe(
        false,
      )
      expect(
        result.filter((event: { uuid: string }) => event.uuid.startsWith('attempt2')),
      ).toHaveLength(limitOf(callUrl(0)))
      expect(result.map((event: { uuid: string }) => event.uuid)).toContain('tail-0')
    })

    it('gives up when the retry hits a 404 too', async () => {
      fetchMock.mockImplementation((url) => {
        if (!afterOf(url)) return Promise.resolve(respond(200, rows('a', limitOf(url))))
        return Promise.resolve(respond(404, { detail: 'Cursor not found' }))
      })
      await expect(
        fetchAllHubUsageData('tok', {
          start: START,
          end: END,
          timeAggregation: 'month',
          groupBy: ['workspace', 'sku'],
        }),
      ).rejects.toThrow()
      expect(fetchMock.mock.calls.filter(([url]) => !afterOf(url))).toHaveLength(2)
    })

    it("throws the API's error detail when the request is refused", async () => {
      fetchMock.mockResolvedValue(respond(403, { detail: 'Requires the hub_admin role' }))
      await expect(
        fetchAllHubUsageData('tok', {
          start: START,
          end: END,
          timeAggregation: 'month',
          groupBy: ['workspace', 'sku'],
        }),
      ).rejects.toThrow('Requires the hub_admin role')
    })
  })

  describe('fetchWorkspaceSummaries', () => {
    const summary = {
      workspace: 'ws-alpha',
      account: '4b48ebea-bdb8-4bb9-bce9-a7853ad3965d',
      category: 'academic',
      assigned_category: 'academic',
      balance: '1250.5',
      as_of: '2026-11-03T10:00:00Z',
      last_usage: null,
      total_granted: '5000',
    }

    it('reads GET /accounting/workspaces with no query parameters', async () => {
      fetchMock.mockResolvedValue(respond(200, [summary]))
      const result = await fetchWorkspaceSummaries('tok')
      expect(callUrl(0)).toMatch(/\/api\/accounting\/workspaces$/)
      const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer tok')
      expect(result).toEqual([summary])
    })

    it("throws the API's error detail when the request is refused", async () => {
      fetchMock.mockResolvedValue(respond(403, { detail: 'Requires the hub_admin role' }))
      await expect(fetchWorkspaceSummaries('tok')).rejects.toThrow('Requires the hub_admin role')
    })
  })
})

describe('Stage 5: hub usage page size', () => {
  const params = {
    start: START,
    end: END,
    timeAggregation: 'month' as const,
    groupBy: ['workspace' as const, 'sku' as const],
  }
  const readers = [
    ['fetchAllHubUsageData', () => fetchAllHubUsageData('tok', params)],
    [
      'fetchAllAggregatedWorkspaceUsageData',
      () => fetchAllAggregatedWorkspaceUsageData('ws-alpha', 'tok', params),
    ],
  ] as const

  describe.each(readers)('%s', (_name, read) => {
    it('sends one request with limit=5000 when fewer rows come back', async () => {
      fetchMock.mockResolvedValue(respond(200, []))
      fetchMock.mockResolvedValueOnce(respond(200, rows('a', 4999)))
      const result = await read()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(callParams(0).get('limit')).toBe('5000')
      expect(callParams(0).has('after')).toBe(false)
      expect(result).toHaveLength(4999)
    })

    it('sends a second request with after when exactly 5,000 rows come back', async () => {
      fetchMock.mockImplementation((url) =>
        Promise.resolve(respond(200, afterOf(url) ? rows('b', 3) : rows('a', 5000))),
      )
      const result = await read()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(callParams(0).get('limit')).toBe('5000')
      expect(callParams(1).get('limit')).toBe('5000')
      expect(afterOf(callUrl(1))).toBe('a-4999')
      expect(result).toHaveLength(5003)
    })
  })

  it('fetchAllWorkspaceUsageData keeps its own page size for raw events', async () => {
    fetchMock.mockResolvedValue(respond(200, rows('a', 2)))
    await fetchAllWorkspaceUsageData('ws-alpha', 'tok', { start: START, end: END })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(callParams(0).get('limit')).not.toBe('5000')
  })
})

describe('Stage 6: drill-down paging', () => {
  const params = {
    start: START,
    end: END,
    timeAggregation: 'month' as const,
    groupBy: ['sku' as const],
  }
  const read = () => fetchAllAggregatedWorkspaceUsageData('ws-alpha', 'tok', params)

  it('reads a full page from the workspace path, then the rest after the cursor', async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(respond(200, afterOf(url) ? rows('b', 3) : rows('a', limitOf(url)))),
    )
    const result = await read()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const index of [0, 1]) {
      expect(callPath(index)).toMatch(/\/api\/workspaces\/ws-alpha\/accounting\/usage-data$/)
      expect(callParams(index).get('start')).toBe(START)
      expect(callParams(index).get('end')).toBe(END)
      expect(groupBy(callParams(index))).toEqual(['sku'])
    }
    expect(callParams(0).has('after')).toBe(false)
    expect(afterOf(callUrl(1))).toBe(`a-${limitOf(callUrl(0)) - 1}`)
    expect(result).toHaveLength(limitOf(callUrl(0)) + 3)
  })

  it('retries the whole fetch once when a cursor page answers 404', async () => {
    let attempt = 0
    fetchMock.mockImplementation((url) => {
      if (!afterOf(url)) {
        attempt += 1
        return Promise.resolve(respond(200, rows(`attempt${attempt}`, limitOf(url))))
      }
      if (attempt === 1) return Promise.resolve(respond(404, { detail: 'Cursor not found' }))
      return Promise.resolve(respond(200, rows('tail', 1)))
    })
    const result = await read()
    expect(attempt).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    const uuids = result.map((event: { uuid: string }) => event.uuid)
    expect(uuids.some((uuid) => uuid.startsWith('attempt1'))).toBe(false)
    expect(uuids.filter((uuid) => uuid.startsWith('attempt2'))).toHaveLength(limitOf(callUrl(0)))
    expect(uuids).toContain('tail-0')
  })

  it('gives up when the retry hits a 404 too', async () => {
    fetchMock.mockImplementation((url) => {
      if (!afterOf(url)) return Promise.resolve(respond(200, rows('a', limitOf(url))))
      return Promise.resolve(respond(404, { detail: 'Cursor not found' }))
    })
    await expect(read()).rejects.toThrow()
    expect(fetchMock.mock.calls.filter(([url]) => !afterOf(url))).toHaveLength(2)
  })

  it('does not retry a 404 on the first page', async () => {
    fetchMock.mockResolvedValue(respond(404, { detail: 'Workspace not found' }))
    await expect(read()).rejects.toThrow('Workspace not found')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('Stage 6: workspace name in the usage path', () => {
  it.each(['ws a/b', 'ws#1', 'ws?x=1'])('encodes %s as one path segment', async (workspace) => {
    fetchMock.mockResolvedValue(respond(200, []))
    await fetchWorkspaceUsageData(workspace, 'tok', { start: START, end: END })
    const url = callUrl(0)
    expect(url).toContain(`/api/workspaces/${encodeURIComponent(workspace)}/accounting/usage-data?`)
    expect(new URLSearchParams(url.split('?').slice(1).join('?')).get('start')).toBe(START)
  })

  it('encodes the name in the paged drill-down read', async () => {
    fetchMock.mockResolvedValue(respond(200, []))
    await fetchAllAggregatedWorkspaceUsageData('ws a/b', 'tok', { start: START, end: END })
    expect(callUrl(0)).toContain('/api/workspaces/ws%20a%2Fb/accounting/usage-data?')
  })
})
