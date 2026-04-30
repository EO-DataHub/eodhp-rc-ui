const COST_API_BASE_URL =
  import.meta.env.VITE_COST_API_BASE_URL ?? import.meta.env.VITE_HUB_BASE_URL

export interface WorkspacesCostOverview {
  window: { start: string; end: string }
  workspaces: { workspaceId: string; totalCost: number }[]
  totalCost: number
}

export interface WorkspaceCostSummary {
  workspaceId: string
  namespace: string
  window: { start: string; end: string }
  totalCost: number
  breakdown: {
    cpuCost: number
    ramCost: number
    pvCost: number
    networkCost: number
    loadBalancerCost: number
    externalCost: number
    adjustments: Record<string, number>
  }
  topDrivers: { name: string; cost: number; share: number }[]
  notes: string[]
}

interface ApiError {
  code: string
  message: string
  requestId?: string
}

export const fetchWorkspacesCostOverview = async ({
  start,
  end,
  token,
}: {
  start: string
  end: string
  token: string
}): Promise<WorkspacesCostOverview> => {
  if (!start || !end) {
    throw new Error('Select a valid date range to view costs.')
  }
  if (!token) {
    throw new Error('You must be signed in to view workspace costs.')
  }
  if (!COST_API_BASE_URL) {
    throw new Error('Cost API base URL is not configured.')
  }

  const url = new URL('/v1/costs/workspaces', COST_API_BASE_URL)
  url.searchParams.set('start', start)
  url.searchParams.set('end', end)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    let parsedError: ApiError | null = null
    try {
      parsedError = (await response.json()) as ApiError
    } catch {
      parsedError = null
    }

    const requestId = response.headers.get('x-request-id') ?? parsedError?.requestId
    const code = parsedError?.code ?? 'UNKNOWN_ERROR'
    const message = parsedError?.message ?? `${response.status} ${response.statusText}`
    throw new Error(
      requestId ? `[${code}] ${message} (requestId=${requestId})` : `[${code}] ${message}`,
    )
  }

  return (await response.json()) as WorkspacesCostOverview
}

export const fetchWorkspaceCost = async ({
  workspace,
  start,
  end,
  token,
}: {
  workspace: string
  start: string
  end: string
  token: string
}): Promise<WorkspaceCostSummary> => {
  if (!workspace) {
    throw new Error('Select a workspace to view costs.')
  }
  if (!start || !end) {
    throw new Error('Select a valid date range to view costs.')
  }
  if (!token) {
    throw new Error('You must be signed in to view workspace costs.')
  }
  if (!COST_API_BASE_URL) {
    throw new Error('Cost API base URL is not configured.')
  }

  const namespace = `ws-${workspace}`
  const url = new URL(`/v1/costs/namespace/${encodeURIComponent(namespace)}`, COST_API_BASE_URL)
  url.searchParams.set('start', start)
  url.searchParams.set('end', end)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    let parsedError: ApiError | null = null
    try {
      parsedError = (await response.json()) as ApiError
    } catch {
      parsedError = null
    }

    const requestId = response.headers.get('x-request-id') ?? parsedError?.requestId
    const code = parsedError?.code ?? 'UNKNOWN_ERROR'
    const message = parsedError?.message ?? `${response.status} ${response.statusText}`
    throw new Error(
      requestId ? `[${code}] ${message} (requestId=${requestId})` : `[${code}] ${message}`,
    )
  }

  return (await response.json()) as WorkspaceCostSummary
}
