const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

// FastAPI's default error body is `{ "detail": "..." }` (or a validation-error array under
// the same key) — surface that instead of a generic status line where the backend provides one.
const extractErrorDetail = async (response: Response): Promise<string | undefined> => {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
      return body.detail
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
  quantity: number
  credits: string
}

export interface FetchUsageDataParams {
  start?: string
  end?: string
  limit?: number
  after?: string
  timeAggregation?: 'day' | 'month'
}

export const fetchWorkspaceUsageData = async (
  workspace: string,
  token: string,
  params: FetchUsageDataParams = {},
): Promise<BillingEvent[]> => {
  const searchParams = new URLSearchParams()
  if (params.start) searchParams.set('start', params.start)
  if (params.end) searchParams.set('end', params.end)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.after) searchParams.set('after', params.after)
  if (params.timeAggregation) searchParams.set('time-aggregation', params.timeAggregation)
  const queryString = searchParams.toString()

  const response = await fetch(
    `${HUB_BASE_URL}/api/workspaces/${workspace}/accounting/usage-data${queryString ? `?${queryString}` : ''}`,
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
