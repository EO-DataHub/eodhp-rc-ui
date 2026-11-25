import { JobLink, JobsApiResponse, WorkflowJob } from '@/types'
import { fetchWorkspaceTokens } from './workspaceTokenService'
import { resolveApiUrl } from './apiUrlUtils'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

/** Number of jobs to fetch per page of a workspace's jobs list */
export const JOBS_PAGE_SIZE = 20

export interface JobsPageOptions {
  /** Maximum number of jobs to return. Leave unset to fetch all jobs. */
  limit?: number
  /** Number of jobs to skip */
  skip?: number
}

/**
 * Returns the `skip` value of the jobs list's `next` link, or undefined when there are no
 * more jobs. Only the number is used, so the workspace token is never sent to a URL taken
 * from the response.
 */
export const getNextJobsSkip = (links: JobLink[]): number | undefined => {
  const next = links.find((link) => link.rel === 'next')
  if (!next?.href) return undefined
  try {
    const skip = Number(new URL(next.href, 'http://localhost').searchParams.get('skip'))
    return Number.isInteger(skip) && skip > 0 ? skip : undefined
  } catch {
    return undefined
  }
}

/** The shape of the `after` cursor of a `scope=called` jobs list: reverse time, workspace, job ID */
const CALLED_AFTER_PATTERN = /^\d{13}\/[^/]+\/[^/]+$/

/**
 * Returns the `after` value of a `scope=called` jobs list's `next` link, or undefined when there
 * are no more jobs. Only the value is used, so the workspace token is never sent to a URL taken
 * from the response.
 */
export const getNextCalledJobsAfter = (links: JobLink[]): string | undefined => {
  const next = links.find((link) => link.rel === 'next')
  if (!next?.href) return undefined
  try {
    const after = new URL(next.href, 'http://localhost').searchParams.get('after')
    return after && CALLED_AFTER_PATTERN.test(after) ? after : undefined
  } catch {
    return undefined
  }
}

/** Fetches one jobs list response for a workspace, with a workspace-scoped token */
const fetchJobsList = async (
  workspaceName: string,
  token: string,
  params: URLSearchParams,
): Promise<JobsApiResponse> => {
  if (!token || !workspaceName) {
    return {
      jobs: [],
      links: [],
      numberTotal: 0,
    }
  }

  try {
    // Get workspace-scoped token
    let workspaceTokens
    try {
      workspaceTokens = await fetchWorkspaceTokens(workspaceName, token)
    } catch (tokenError) {
      throw new Error(
        `Failed to obtain workspace-scoped token for ${workspaceName}. Please ensure you have access to this workspace.`,
      )
    }

    const query = params.toString()

    // Fetch jobs from API endpoint
    const response = await fetch(
      `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspaceName}/jobs${
        query ? `?${query}` : ''
      }`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${workspaceTokens.access}`,
        },
      },
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          `Unauthorized: Unable to access workflow jobs for workspace "${workspaceName}". Please check your workspace permissions.`,
        )
      }
      throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Validate and return response
    return {
      jobs: data.jobs || [],
      links: data.links || [],
      numberTotal: data.numberTotal ?? 0,
    }
  } catch (error) {
    // Propagate error to React Query so it can handle it properly
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch workflow jobs')
  }
}

/**
 * Fetches workflow execution jobs for a specific workspace, newest first
 * @param workspaceName - The workspace name
 * @param token - User authentication token
 * @param options - Optional `limit` and `skip` to fetch one page of jobs
 * @returns Promise resolving to JobsApiResponse with jobs array, links, and numberTotal
 */
export const fetchJobsForWorkspace = async (
  workspaceName: string,
  token: string,
  options: JobsPageOptions = {},
): Promise<JobsApiResponse> => {
  const params = new URLSearchParams()
  if (options.limit) params.set('limit', String(options.limit))
  if (options.skip) params.set('skip', String(options.skip))
  return fetchJobsList(workspaceName, token, params)
}

/**
 * Fetches one page of the jobs a workspace started on workflows in other workspaces, newest
 * first (`scope=called`). The jobs' links point at the workspace each job ran in.
 * @param workspaceName - The workspace that started the jobs
 * @param token - User authentication token
 * @param after - The `after` value from the previous page's `next` link; unset for the first page
 * @returns Promise resolving to JobsApiResponse. `numberTotal` is the number of jobs on the page.
 */
export const fetchCalledJobs = async (
  workspaceName: string,
  token: string,
  after?: string,
): Promise<JobsApiResponse> => {
  const params = new URLSearchParams({ scope: 'called', limit: String(JOBS_PAGE_SIZE) })
  if (after) params.set('after', after)
  return fetchJobsList(workspaceName, token, params)
}

/**
 * Fetches workflow execution jobs for a shared results workspace, using a
 * workspace-scoped token obtained for the currently selected workspace.
 * @param sharedWorkspaceName - The shared results workspace name
 * @param tokenWorkspaceName - The workspace name used to obtain the scoped token (typically the currently selected workspace)
 * @param token - User authentication token
 * @returns Promise resolving to JobsApiResponse with jobs array, links, and numberTotal
 */
export const fetchJobsForSharedWorkspace = async (
  sharedWorkspaceName: string,
  tokenWorkspaceName: string,
  token: string,
): Promise<JobsApiResponse> => {
  if (!token || !sharedWorkspaceName || !tokenWorkspaceName) {
    return {
      jobs: [],
      links: [],
      numberTotal: 0,
    }
  }

  try {
    // Get workspace-scoped token for the selected workspace
    let workspaceTokens
    try {
      workspaceTokens = await fetchWorkspaceTokens(tokenWorkspaceName, token)
    } catch (tokenError) {
      throw new Error(
        `Failed to obtain workspace-scoped token for ${tokenWorkspaceName}. Please ensure you have access to this workspace.`,
      )
    }

    // Fetch jobs for the shared workspace using the selected workspace token
    const response = await fetch(
      `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${sharedWorkspaceName}/jobs`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${workspaceTokens.access}`,
        },
      },
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          `Unauthorized: Unable to access workflow jobs for shared workspace "${sharedWorkspaceName}". Please check your workspace permissions.`,
        )
      }
      throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return {
      jobs: data.jobs || [],
      links: data.links || [],
      numberTotal: data.numberTotal ?? 0,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch workflow jobs for shared workspace')
  }
}

/**
 * Fetches details for a single workflow job using a workspace-scoped token
 * @param workspaceName - The workspace name
 * @param jobId - The job identifier
 * @param workspaceToken - Workspace-scoped access token
 * @returns Promise resolving to a WorkflowJob
 */
export const fetchJobById = async (
  workspaceName: string,
  jobId: string,
  workspaceToken: string,
): Promise<WorkflowJob> => {
  if (!workspaceName || !jobId || !workspaceToken) {
    throw new Error('Workspace name, job ID and workspace token are required to fetch a job.')
  }

  const url = `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspaceName}/jobs/${jobId}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${workspaceToken}`,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Job "${jobId}" was not found in workspace "${workspaceName}".`)
    }
    if (response.status === 401) {
      throw new Error(
        `Unauthorized: Unable to access workflow job "${jobId}" for workspace "${workspaceName}".`,
      )
    }
    throw new Error(`Failed to fetch job: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as WorkflowJob
}

/**
 * Fetches job results from a results URL using a workspace-scoped token.
 * The results may be JSON (e.g. STAC item) or text; the caller should handle the returned shape.
 * @param resultsUrl - Absolute or API-relative URL for the job results
 * @param workspaceToken - Workspace-scoped access token
 */
export const fetchJobResults = async (
  resultsUrl: string,
  workspaceToken: string,
): Promise<unknown> => {
  if (!resultsUrl || !workspaceToken) {
    throw new Error('Results URL and workspace token are required to fetch job results.')
  }

  const url = resolveApiUrl(resultsUrl)

  const headers: HeadersInit = {
    Accept: 'application/json, application/geo+json, text/plain;q=0.9, */*;q=0.8',
  }

  // Always attach Authorization for HTTPS URLs when a workspace token is present
  if (url.protocol === 'https:' && workspaceToken) {
    headers.Authorization = `Bearer ${workspaceToken}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job results not found.')
    }
    if (response.status === 401) {
      throw new Error('Unauthorized: Unable to access job results.')
    }
    throw new Error(`Failed to fetch job results: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json') || contentType.includes('application/geo+json')) {
    return response.json()
  }

  return response.text()
}

/**
 * Fetches the contents of a job log using a workspace-scoped token.
 * @param logUrl - Absolute or API-relative URL for the log file
 * @param workspaceToken - Workspace-scoped access token
 * @returns Promise resolving to log text
 */
export const fetchJobLog = async (logUrl: string, workspaceToken: string): Promise<string> => {
  if (!logUrl || !workspaceToken) {
    throw new Error('Log URL and workspace token are required to fetch a job log.')
  }

  const url = resolveApiUrl(logUrl)

  const headers: HeadersInit = {
    Accept: 'text/plain, */*',
  }

  // Always attach Authorization for HTTPS URLs when a workspace token is present
  if (url.protocol === 'https:' && workspaceToken) {
    headers.Authorization = `Bearer ${workspaceToken}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job log not found.')
    }
    if (response.status === 401) {
      throw new Error('Unauthorized: Unable to access job log.')
    }
    throw new Error(`Failed to fetch job log: ${response.status} ${response.statusText}`)
  }

  return response.text()
}
