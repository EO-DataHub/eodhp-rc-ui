import { JobsApiResponse, WorkflowJob } from '@/types'
import { fetchWorkspaceTokens } from './workspaceTokenService'
import { isHubOriginUrl, resolveApiUrl } from './apiUrlUtils'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

/**
 * Fetches workflow execution jobs for a specific workspace
 * @param workspaceName - The workspace name
 * @param token - User authentication token
 * @returns Promise resolving to JobsApiResponse with jobs array, links, and numberTotal
 */
export const fetchJobsForWorkspace = async (
  workspaceName: string,
  token: string,
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

    // Fetch jobs from API endpoint
    const response = await fetch(
      `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspaceName}/jobs`,
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

  const data = (await response.json()) as WorkflowJob
  return data
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

  // Only attach Authorization when talking to the hub origin
  if (isHubOriginUrl(url)) {
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

  // Only attach Authorization when talking to the hub origin
  if (isHubOriginUrl(url)) {
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
