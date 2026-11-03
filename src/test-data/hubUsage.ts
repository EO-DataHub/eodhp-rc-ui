import { vi } from 'vitest'

export type FixturePeriodType = 'day' | 'week' | 'month' | 'quarter'

/** "Now" for every hub usage component test: Tuesday 3 November 2026, mid-morning UTC. */
export const NOW = new Date('2026-11-03T10:00:00Z')

/** Radix menus, selects and scroll areas call browser APIs that jsdom does not have. */
export const stubRadixBrowserApis = () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
}

export const skus = [
  { uuid: 'sku-1', sku: 'wfcpu', name: 'Workflow CPU', unit: 'cpu-seconds' },
  { uuid: 'sku-2', sku: 'storage', name: 'Storage', unit: 'GB-hours' },
  { uuid: 'sku-3', sku: 'gpu', name: 'GPU hours', unit: 'gpu-hours' },
]

const AS_OF = '2026-11-03T10:00:00Z'

export const ALPHA_ACCOUNT = '4b48ebea-bdb8-4bb9-bce9-a7853ad3965d'

/** Every workspace, as `GET /accounting/workspaces` lists them. Delta and epsilon are idle. */
export const workspaceSummaries = [
  {
    workspace: 'ws-alpha',
    account: ALPHA_ACCOUNT,
    category: 'academic',
    assigned_category: 'academic',
    balance: '1250.5',
    as_of: AS_OF,
    last_usage: '2026-11-02T12:00:00Z',
    total_granted: '5000',
  },
  {
    workspace: 'ws-beta',
    account: '0d7f3a52-6a7e-4c55-9d0e-2f1a9b2c3d4e',
    category: 'standard',
    assigned_category: null,
    balance: '20',
    as_of: AS_OF,
    last_usage: '2026-11-01T12:00:00Z',
    total_granted: '1000',
  },
  {
    workspace: 'ws-gamma',
    account: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
    category: 'standard',
    assigned_category: 'standard',
    balance: '5000',
    as_of: AS_OF,
    last_usage: '2026-10-30T12:00:00Z',
    total_granted: '6000',
  },
  {
    workspace: 'ws-delta',
    account: null,
    category: 'standard',
    assigned_category: null,
    balance: '80',
    as_of: AS_OF,
    last_usage: '2026-09-20T12:00:00Z',
    total_granted: '160',
  },
  {
    workspace: 'ws-epsilon',
    account: null,
    category: 'standard',
    assigned_category: null,
    balance: '100',
    as_of: AS_OF,
    last_usage: null,
    total_granted: '100',
  },
]

interface UsageFigures {
  credits: string
  quantity: number
}

export interface UsageEntry {
  workspace: string
  sku: string
  /** Usage in the selected period. */
  current?: UsageFigures
  /** Usage in the period before it. */
  previous?: UsageFigures
}

/**
 * Usage for the selected period and the one before it, whatever the period is.
 *
 * Selected period totals: alpha 1,800 (60%), beta 900 (30%), gamma 300 (10%), all 3,000.
 * Change: alpha +1,204.50, beta New, gamma -50.00. Delta used something only in the previous
 * period, so it is idle in the selected one.
 */
export const usage: UsageEntry[] = [
  {
    workspace: 'ws-alpha',
    sku: 'wfcpu',
    current: { credits: '1500.00', quantity: 3000 },
    previous: { credits: '595.50', quantity: 1191 },
  },
  { workspace: 'ws-alpha', sku: 'storage', current: { credits: '300.00', quantity: 30 } },
  { workspace: 'ws-beta', sku: 'storage', current: { credits: '700.00', quantity: 70 } },
  { workspace: 'ws-beta', sku: 'wfcpu', current: { credits: '200.00', quantity: 400 } },
  {
    workspace: 'ws-gamma',
    sku: 'wfcpu',
    current: { credits: '300.00', quantity: 600 },
    previous: { credits: '350.00', quantity: 700 },
  },
  { workspace: 'ws-delta', sku: 'storage', previous: { credits: '80.00', quantity: 8 } },
]

export const RANKED_WORKSPACES = ['ws-alpha', 'ws-beta', 'ws-gamma']

/** The start of the period after the one starting at `start`, in UTC. */
export const nextPeriodStart = (type: FixturePeriodType, start: Date): Date => {
  const y = start.getUTCFullYear()
  const m = start.getUTCMonth()
  const d = start.getUTCDate()
  switch (type) {
    case 'day':
      return new Date(Date.UTC(y, m, d + 1))
    case 'week':
      return new Date(Date.UTC(y, m, d + 7))
    case 'month':
      return new Date(Date.UTC(y, m + 1, 1))
    case 'quarter':
      return new Date(Date.UTC(y, m + 3, 1))
  }
}

export interface RecordedRequest {
  path: string
  params: URLSearchParams
  headers: Record<string, string>
}

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

const page = (rows: { uuid: string }[], params: URLSearchParams) => {
  const limit = Number(params.get('limit') ?? 100)
  const after = params.get('after')
  const from = after ? rows.findIndex((row) => row.uuid === after) + 1 : 0
  return rows.slice(from, from + limit)
}

/**
 * A fake accounting API on `fetch`. Usage rows are built from `usage` for whatever range the
 * page asks for: the first period of the range gets the `previous` figures, the next one the
 * `current` figures. `sku=` filters rows as the API does, and `limit`/`after` page them.
 */
export interface HubApiOptions {
  /** Usage entries to serve instead of the default `usage`. */
  usage?: UsageEntry[]
  /** Leave `GET /accounting/skus` unanswered until `releaseSkus()` is called. */
  holdSkus?: boolean
}

export const installHubApi = (options: HubApiOptions = {}) => {
  const requests: RecordedRequest[] = []
  const usageEntries = options.usage ?? usage
  let releaseHeldSkus: (() => void) | undefined
  const skusHeld = options.holdSkus
    ? new Promise<void>((resolve) => {
        releaseHeldSkus = resolve
      })
    : Promise.resolve()
  const failures = new Map<string, { status: number; body: unknown }>()

  const usageRows = (params: URLSearchParams, workspace?: string) => {
    const type = (params.get('time-aggregation') ?? 'month') as FixturePeriodType
    const rangeStart = new Date(params.get('start') ?? NOW.toISOString())
    const boundary = nextPeriodStart(type, rangeStart)
    const boundaryEnd = nextPeriodStart(type, boundary)
    const sku = params.get('sku')
    const rows: Record<string, unknown>[] = []
    usageEntries
      .filter((entry) => (workspace ? entry.workspace === workspace : true))
      .filter((entry) => (sku ? entry.sku === sku : true))
      .forEach((entry) => {
        const periods: [string, UsageFigures | undefined, Date, Date][] = [
          ['prev', entry.previous, rangeStart, boundary],
          ['cur', entry.current, boundary, boundaryEnd],
        ]
        periods.forEach(([key, figures, start, end]) => {
          if (!figures) return
          rows.push({
            uuid: `${entry.workspace}-${entry.sku}-${key}`,
            event_start: start.toISOString(),
            event_end: end.toISOString(),
            item: entry.sku,
            user: null,
            workspace: workspace ? null : entry.workspace,
            quantity: figures.quantity,
            credits: figures.credits,
          })
        })
      })
    return rows as { uuid: string }[]
  }

  const fetchMock = vi.fn((input: unknown, init?: { headers?: Record<string, string> }) => {
    const url = String(input)
    const [pathPart, query = ''] = url.split('?')
    const path = pathPart.replace(/^.*?\/api\//, '/api/')
    const params = new URLSearchParams(query)
    requests.push({ path, params, headers: { ...(init?.headers ?? {}) } })

    const failure = [...failures.entries()].find(([prefix]) => path.startsWith(prefix))
    if (failure) return Promise.resolve(respond(failure[1].status, failure[1].body))

    if (path === '/api/accounting/skus') return skusHeld.then(() => respond(200, skus))
    if (path === '/api/accounting/workspaces') {
      return Promise.resolve(respond(200, workspaceSummaries))
    }
    if (path === '/api/accounting/usage-data') {
      return Promise.resolve(respond(200, page(usageRows(params), params)))
    }
    const workspaceUsage = path.match(/^\/api\/workspaces\/([^/]+)\/accounting\/usage-data$/)
    if (workspaceUsage) {
      return Promise.resolve(respond(200, page(usageRows(params, workspaceUsage[1]), params)))
    }
    const balance = path.match(/^\/api\/workspaces\/([^/]+)\/accounting\/balance$/)
    if (balance) {
      const summary = workspaceSummaries.find((ws) => ws.workspace === balance[1])
      return Promise.resolve(
        respond(200, { workspace: balance[1], balance: summary?.balance ?? '0', as_of: AS_OF }),
      )
    }
    return Promise.resolve(respond(404, { detail: `No fixture for ${path}` }))
  })

  vi.stubGlobal('fetch', fetchMock)

  const usageRequests = (pathPrefix = '/api/accounting/usage-data') =>
    requests.filter((request) => request.path.startsWith(pathPrefix))

  return {
    fetchMock,
    requests,
    /** Make every request whose path starts with `pathPrefix` fail with this status and body. */
    fail: (pathPrefix: string, status: number, body: unknown) => {
      failures.set(pathPrefix, { status, body })
    },
    usageRequests,
    /** Answers the held `GET /accounting/skus` requests. */
    releaseSkus: () => releaseHeldSkus?.(),
    lastUsageRequest: (pathPrefix = '/api/accounting/usage-data') => {
      const matching = usageRequests(pathPrefix)
      return matching[matching.length - 1]
    },
  }
}

export type HubApi = ReturnType<typeof installHubApi>
