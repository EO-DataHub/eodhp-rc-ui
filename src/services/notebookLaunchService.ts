/**
 * Notebook Launch API client.
 * Creates parameterized notebooks and returns JupyterHub spawn URLs.
 *
 * @see specs/notebook-launch-api-changes.md
 */

export interface NotebookLaunchRequest {
  workspace_name: string
  username: string
  action_name: string
  template_url: string
  variables?: Record<string, string>
}

export interface NotebookLaunchResponse {
  servername: string
  notebook_path: string
  spawn_url: string
}

const ERROR_MESSAGES: Record<string, string> = {
  TEMPLATE_FETCH_FAILED: 'Unable to fetch notebook template. Please check the template URL.',
  TEMPLATE_PARSE_FAILED: 'Template file is invalid. Please contact support.',
  VALIDATION_ERROR: 'Invalid request. Please check all fields are filled correctly.',
  NOTEBOOK_UPLOAD_FAILED: 'Failed to save notebook. Please try again or contact support.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
}

function getBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_RC_SUPPORT_UTILS_URL as string | undefined
  if (apiUrl && typeof apiUrl === 'string') {
    return apiUrl.replace(/\/$/, '')
  }
  return ''
}

/**
 * Launches a parameterized notebook and returns the spawn URL.
 * On success, open the spawn_url in a new tab.
 *
 * @throws Error with user-friendly message on failure
 */
export async function launchNotebook(
  request: NotebookLaunchRequest,
  token: string,
): Promise<string> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error(
      'Notebook launch API is not configured. Please check VITE_RC_SUPPORT_UTILS_URL.',
    )
  }

  const url = `${baseUrl}/api/v1/notebooks/launch`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  })

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

  const data = (await response.json()) as NotebookLaunchResponse
  return data.spawn_url
}
