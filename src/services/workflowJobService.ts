import { JobsApiResponse } from '@/types'
import { fetchWorkspaceTokens } from './workspaceTokenService'

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
