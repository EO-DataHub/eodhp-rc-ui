const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

// FastAPI's default error body is `{ "detail": "..." }` (or a validation-error array of
// `{ msg, loc, type }` objects under the same key) — surface that instead of a generic status
// line where the backend provides one.
const extractErrorDetail = async (response: Response): Promise<string | undefined> => {
  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || !('detail' in body)) return undefined

    const { detail } = body as { detail: unknown }
    if (typeof detail === 'string') return detail

    if (Array.isArray(detail)) {
      const messages = (detail as unknown[])
        .map((item) => {
          if (!item || typeof item !== 'object' || !('msg' in item)) return undefined
          const { msg } = item as Record<string, unknown>
          return typeof msg === 'string' ? msg : undefined
        })
        .filter((msg): msg is string => Boolean(msg))
      return messages.length > 0 ? messages.join('; ') : undefined
    }

    return undefined
  } catch {
    return undefined
  }
}

export interface CreditBalance {
  workspace: string
  balance: string
  as_of: string
}

export const fetchWorkspaceBalance = async (
  workspace: string,
  token: string,
): Promise<CreditBalance> => {
  const response = await fetch(`${HUB_BASE_URL}/api/workspaces/${workspace}/accounting/balance`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new Error(
      detail ?? `Failed to fetch credit balance: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as CreditBalance
}

export interface PolicyRate {
  sku: string
  credits_per_unit: string
}

export interface CategoryMultiplier {
  category: string
  multiplier: string
}

export interface PricingPolicy {
  version: number
  valid_from: string
  configured_at: string
  default_category: string
  rates: PolicyRate[]
  category_multipliers: CategoryMultiplier[]
}

export const fetchPricingPolicy = async (token: string): Promise<PricingPolicy> => {
  const response = await fetch(`${HUB_BASE_URL}/api/accounting/pricing-policy`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new Error(
      detail ?? `Failed to fetch pricing policy: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as PricingPolicy
}

export interface BillingItem {
  uuid: string
  sku: string
  name: string
  unit: string
}

export const fetchSkus = async (token: string): Promise<BillingItem[]> => {
  const response = await fetch(`${HUB_BASE_URL}/api/accounting/skus`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new Error(
      detail ?? `Failed to fetch billing items: ${response.status} ${response.statusText}`,
    )
  }

  const skus = await response.json()

  if (!Array.isArray(skus)) {
    throw new Error('Unexpected response format when fetching billing items.')
  }

  return skus as BillingItem[]
}

export interface BillingEvent {
  uuid: string
  event_start: string
  event_end: string
  item: string
  workspace: string
  user?: string | null
  quantity: number
  credits: string
}

export type UsageGroupBy = 'workspace' | 'sku' | 'user'

export interface FetchUsageDataParams {
  start?: string
  end?: string
  limit?: number
  after?: string
  timeAggregation?: 'day' | 'week' | 'month' | 'quarter'
  groupBy?: UsageGroupBy[]
  sku?: string
}

// Carries the HTTP status so callers can tell a stale paging cursor (404) from other errors.
export class UsageRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'UsageRequestError'
    this.status = status
  }
}

// The API rejects unknown or empty query parameters with a 422, so only set what has a value.
const usageSearchParams = (params: FetchUsageDataParams): URLSearchParams => {
  const searchParams = new URLSearchParams()
  if (params.start) searchParams.set('start', params.start)
  if (params.end) searchParams.set('end', params.end)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.after) searchParams.set('after', params.after)
  if (params.timeAggregation) searchParams.set('time-aggregation', params.timeAggregation)
  if (params.groupBy && params.groupBy.length > 0) {
    searchParams.set('group-by', params.groupBy.join(','))
  }
  if (params.sku) searchParams.set('sku', params.sku)
  return searchParams
}

const fetchUsageData = async (
  path: string,
  token: string,
  params: FetchUsageDataParams,
): Promise<BillingEvent[]> => {
  const queryString = usageSearchParams(params).toString()

  const response = await fetch(`${HUB_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new UsageRequestError(
      detail ?? `Failed to fetch usage data: ${response.status} ${response.statusText}`,
      response.status,
    )
  }

  const events = await response.json()

  if (!Array.isArray(events)) {
    throw new Error('Unexpected response format when fetching usage data.')
  }

  return events as BillingEvent[]
}

export const fetchWorkspaceUsageData = async (
  workspace: string,
  token: string,
  params: FetchUsageDataParams = {},
): Promise<BillingEvent[]> =>
  fetchUsageData(`/api/workspaces/${workspace}/accounting/usage-data`, token, params)

// Usage across every workspace. The API only allows this for hub admins.
export const fetchHubUsageData = async (
  token: string,
  params: FetchUsageDataParams = {},
): Promise<BillingEvent[]> => fetchUsageData('/api/accounting/usage-data', token, params)

export interface WorkspaceSummary {
  workspace: string
  account: string | null
  category: string
  assigned_category: string | null
  balance: string
  as_of: string
  last_usage: string | null
  total_granted: string
}

// Every workspace with its current balance, account and category. Hub admins only.
export const fetchWorkspaceSummaries = async (token: string): Promise<WorkspaceSummary[]> => {
  const response = await fetch(`${HUB_BASE_URL}/api/accounting/workspaces`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new Error(
      detail ?? `Failed to fetch workspaces: ${response.status} ${response.statusText}`,
    )
  }

  const summaries = await response.json()

  if (!Array.isArray(summaries)) {
    throw new Error('Unexpected response format when fetching workspaces.')
  }

  return summaries as WorkspaceSummary[]
}

export interface LedgerTransaction {
  uuid: string
  workspace: string
  user: string | null
  transaction_type: 'debit' | 'grant' | 'reversal'
  credits: string
  occurred_at: string
  recorded_at: string
  reason: string | null
}

export interface FetchLedgerParams {
  transactionType?: 'debit' | 'grant' | 'reversal'
  start?: string
  end?: string
  limit?: number
  after?: string
}

export const fetchWorkspaceLedger = async (
  workspace: string,
  token: string,
  params: FetchLedgerParams = {},
): Promise<LedgerTransaction[]> => {
  const searchParams = new URLSearchParams()
  if (params.transactionType) searchParams.set('type', params.transactionType)
  if (params.start) searchParams.set('start', params.start)
  if (params.end) searchParams.set('end', params.end)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.after) searchParams.set('after', params.after)
  const queryString = searchParams.toString()

  const response = await fetch(
    `${HUB_BASE_URL}/api/workspaces/${workspace}/accounting/ledger${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new Error(detail ?? `Failed to fetch ledger: ${response.status} ${response.statusText}`)
  }

  const transactions = await response.json()

  if (!Array.isArray(transactions)) {
    throw new Error('Unexpected response format when fetching ledger.')
  }

  return transactions as LedgerTransaction[]
}

const USAGE_PAGE_SIZE = 500
// Safety cap on pages followed, so an unexpected backend cursor bug can't hang the UI in an
// endless fetch loop — well beyond what a single bounded (e.g. one month) range should need.
const MAX_USAGE_PAGES = 50

// Fetches every event in a bounded start/end range by following the `after` cursor until the
// last page. Only safe to call with a bounded range (e.g. one month) — looping this over
// unbounded history would be the same problem this was built to avoid.
export const fetchAllWorkspaceUsageData = async (
  workspace: string,
  token: string,
  params: Pick<FetchUsageDataParams, 'start' | 'end'> = {},
): Promise<BillingEvent[]> => {
  const events: BillingEvent[] = []
  let after: string | undefined
  for (let page = 0; page < MAX_USAGE_PAGES; page += 1) {
    const batch = await fetchWorkspaceUsageData(workspace, token, {
      ...params,
      limit: USAGE_PAGE_SIZE,
      after,
    })
    events.push(...batch)
    if (batch.length < USAGE_PAGE_SIZE) break
    after = batch[batch.length - 1].uuid
  }
  return events
}

// Aggregated reads use large pages: each page costs the server a full aggregation, so a typical
// range should come back in one request.
const AGGREGATED_USAGE_PAGE_SIZE = 5000
// Hub-wide reads group by workspace and SKU per period, so a bounded range stays well under
// this many pages; the cap only stops a runaway loop.
const MAX_HUB_USAGE_PAGES = 100

type PagedUsageParams = Omit<FetchUsageDataParams, 'limit' | 'after'>

class StaleCursorError extends Error {}

type UsagePageFetcher = (params: FetchUsageDataParams) => Promise<BillingEvent[]>

const fetchAllUsagePages = async (
  fetchPage: UsagePageFetcher,
  params: PagedUsageParams,
): Promise<BillingEvent[]> => {
  const events: BillingEvent[] = []
  let after: string | undefined
  for (let page = 0; page < MAX_HUB_USAGE_PAGES; page += 1) {
    let batch: BillingEvent[]
    try {
      batch = await fetchPage({ ...params, limit: AGGREGATED_USAGE_PAGE_SIZE, after })
    } catch (error) {
      if (after && error instanceof UsageRequestError && error.status === 404) {
        throw new StaleCursorError(error.message)
      }
      throw error
    }
    events.push(...batch)
    if (batch.length < AGGREGATED_USAGE_PAGE_SIZE) return events
    after = batch[batch.length - 1].uuid
  }
  throw new Error('Too much usage data to show for this range.')
}

// Rows are aggregates, so a total can change under the cursor while paging and the API
// answers 404 for it; the whole fetch is then retried once from the start.
const fetchAllUsageWithRetry = async (
  fetchPage: UsagePageFetcher,
  params: PagedUsageParams,
): Promise<BillingEvent[]> => {
  try {
    return await fetchAllUsagePages(fetchPage, params)
  } catch (error) {
    if (!(error instanceof StaleCursorError)) throw error
    return fetchAllUsagePages(fetchPage, params)
  }
}

// Fetches every hub-wide usage row in a bounded range by following the `after` cursor.
export const fetchAllHubUsageData = async (
  token: string,
  params: PagedUsageParams = {},
): Promise<BillingEvent[]> =>
  fetchAllUsageWithRetry((pageParams) => fetchHubUsageData(token, pageParams), params)

// Fetches every aggregated usage row of one workspace in a bounded range, paging and
// retrying as the hub-wide read does.
export const fetchAllAggregatedWorkspaceUsageData = async (
  workspace: string,
  token: string,
  params: PagedUsageParams = {},
): Promise<BillingEvent[]> =>
  fetchAllUsageWithRetry(
    (pageParams) => fetchWorkspaceUsageData(workspace, token, pageParams),
    params,
  )
