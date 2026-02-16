/**
 * Workflow Launch API client.
 * Submits workflow execution requests and returns workflow run identifiers.
 *
 * @see specs/001-workflow-integration/contracts/workflow-execution-api.md
 */

export interface WorkflowLaunchRequest {
  [key: string]: string | number | boolean | object
}

export interface WorkflowLaunchResponse {
  workflowId: string
  status: string
  submittedAt: string
}

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Invalid input parameters. Please check all fields are filled correctly.',
  AUTH_ERROR: 'Authentication required. Please log in and try again.',
  AUTHZ_ERROR: 'Insufficient permissions to launch this workflow.',
  NOT_FOUND: 'Workflow not found. Please try selecting a different workflow.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'Workflow service is temporarily unavailable. Please try again later.',
}

/**
 * Launches a workflow execution and returns the workflow run identifier.
 *
 * @param executionUrl - The workflow execution endpoint URL (constructed from application-platform link + /execution)
 * @param request - Workflow input variables matching the workflow's inputParameters
 * @param token - Authentication token
 * @returns WorkflowLaunchResponse with workflowId, status, and submittedAt
 * @throws Error with user-friendly message on failure
 */
export async function launchWorkflow(
  executionUrl: string,
  request: WorkflowLaunchRequest,
  token: string,
): Promise<WorkflowLaunchResponse> {
  if (!executionUrl) {
    throw new Error('Workflow execution URL is required.')
  }

  // Create AbortController for timeout handling
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    // Wrap request payload in "inputs" key as required by workflow execution API
    const requestBody = {
      inputs: request,
    }

    const response = await fetch(executionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let message: string
      try {
        const body = (await response.json()) as { error?: string; code?: string }
        const code = body.code ?? ''
        message = ERROR_MESSAGES[code] ?? body.error ?? `Request failed (${response.status})`
      } catch {
        message = `Request failed: ${response.status} ${response.statusText}`
      }
      throw new Error(message)
    }

    // Workflow API returns 202 Accepted for async execution
    if (response.status === 202) {
      const data = (await response.json()) as WorkflowLaunchResponse
      return data
    }

    // Handle unexpected success status codes
    const data = (await response.json()) as WorkflowLaunchResponse
    return data
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw err
  }
}
