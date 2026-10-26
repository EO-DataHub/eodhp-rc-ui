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
  const response = await fetch(
    `${HUB_BASE_URL}/api/workspaces/${encodeURIComponent(workspace)}/accounting/balance`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

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
  quantity: number
  credits: string
}

// Calendar periods in UTC, as the API defines them: a week starts on Monday, a quarter on
// 1 January, April, July or October.
export type TimeAggregation = 'day' | 'week' | 'month' | 'quarter'

export type UsageDimension = 'user' | 'sku' | 'workspace'

export interface FetchUsageDataParams {
  start?: string
  end?: string
  limit?: number
  after?: string
  timeAggregation?: TimeAggregation
  sku?: string
  // Only meaningful with timeAggregation. An empty array totals over the period alone; omit it
  // for the API default of sku + workspace.
  groupBy?: UsageDimension[]
}

const fetchUsageData = async (
  path: string,
  token: string,
  params: FetchUsageDataParams,
): Promise<BillingEvent[]> => {
  const searchParams = new URLSearchParams()
  if (params.start) searchParams.set('start', params.start)
  if (params.end) searchParams.set('end', params.end)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.after) searchParams.set('after', params.after)
  if (params.timeAggregation) searchParams.set('time-aggregation', params.timeAggregation)
  if (params.sku) searchParams.set('sku', params.sku)
  if (params.groupBy) searchParams.set('group-by', params.groupBy.join(','))
  const queryString = searchParams.toString()

  const response = await fetch(
    `${HUB_BASE_URL}/api/${path}${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new Error(
      detail ?? `Failed to fetch usage data: ${response.status} ${response.statusText}`,
    )
  }

  const events = await response.json()

  if (!Array.isArray(events)) {
    throw new Error('Unexpected response format when fetching usage data.')
  }

  return events as BillingEvent[]
}

export const fetchWorkspaceUsageData = (
  workspace: string,
  token: string,
  params: FetchUsageDataParams = {},
): Promise<BillingEvent[]> =>
  fetchUsageData(`workspaces/${encodeURIComponent(workspace)}/accounting/usage-data`, token, params)

// Usage across every workspace. Hub admins only: anyone else gets a 401.
export const fetchAllWorkspacesUsageData = (
  token: string,
  params: FetchUsageDataParams = {},
): Promise<BillingEvent[]> => fetchUsageData('accounting/usage-data', token, params)

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
    `${HUB_BASE_URL}/api/workspaces/${encodeURIComponent(workspace)}/accounting/ledger${queryString ? `?${queryString}` : ''}`,
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
