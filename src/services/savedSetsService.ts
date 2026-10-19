const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

// Saved sets are called "pin sets" in the workspace-services API.

/** UI-only state stored with each item, so opening a set restores how it looked on the map. */
/** Name and description limits enforced by workspace-services. */
export const MAX_SET_NAME_LENGTH = 100
export const MAX_SET_DESCRIPTION_LENGTH = 1000

export interface SavedSetItemDisplay {
  renderId?: string
  visible?: boolean
  opacity?: number
  isUserCollection?: boolean
}

export interface SavedSetSummary {
  id: string
  workspace: string
  name: string
  description: string
  visibility: 'workspace' | 'private'
  createdBy: string
  createdAt: string
  updatedAt: string
  itemCount: number
}

export interface SavedSetItem {
  id: string
  collectionId: string
  itemId: string
  selfHref: string
  display?: SavedSetItemDisplay
  position: number
  addedAt: string
}

export interface SavedSet extends SavedSetSummary {
  items: SavedSetItem[]
}

export interface SavedSetItemInput {
  collectionId: string
  itemId: string
  selfHref: string
  display?: SavedSetItemDisplay
}

export interface CreateSavedSetPayload {
  name: string
  description?: string
  items: SavedSetItemInput[]
}

export interface UpdateSavedSetPayload {
  name?: string
  description?: string
}

const setsUrl = (workspace: string) =>
  `${HUB_BASE_URL}/api/workspaces/${encodeURIComponent(workspace)}/pin-sets`

const setUrl = (workspace: string, setId: string) =>
  `${setsUrl(workspace)}/${encodeURIComponent(setId)}`

// The service writes error messages as a JSON string body, e.g. "A pin set with this name already exists".
const extractErrorMessage = async (response: Response): Promise<string | undefined> => {
  try {
    const body: unknown = await response.json()
    return typeof body === 'string' && body ? body : undefined
  } catch {
    return undefined
  }
}

const throwResponseError = async (response: Response, action: string): Promise<never> => {
  if (response.status === 409) {
    throw new Error('A saved set with this name already exists in this workspace.')
  }
  if (response.status === 403) {
    throw new Error(
      (await extractErrorMessage(response)) ?? `You don't have permission to ${action}.`,
    )
  }
  if (response.status === 404) {
    throw new Error("This saved set doesn't exist, or it was deleted.")
  }
  const message = await extractErrorMessage(response)
  throw new Error(message ?? `Failed to ${action}: ${response.status} ${response.statusText}`)
}

const request = async <T>(
  url: string,
  token: string,
  action: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> => {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  if (!response.ok) {
    return throwResponseError(response, action)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const fetchSavedSets = (workspace: string, token: string) =>
  request<SavedSetSummary[]>(setsUrl(workspace), token, 'load saved sets')

export const fetchSavedSet = (workspace: string, setId: string, token: string) =>
  request<SavedSet>(setUrl(workspace, setId), token, 'load this saved set')

export const createSavedSet = (workspace: string, payload: CreateSavedSetPayload, token: string) =>
  request<SavedSet>(setsUrl(workspace), token, 'save this set', {
    method: 'POST',
    body: { ...payload, visibility: 'workspace' },
  })

export const updateSavedSet = (
  workspace: string,
  setId: string,
  payload: UpdateSavedSetPayload,
  token: string,
) =>
  request<SavedSet>(setUrl(workspace, setId), token, 'change this set', {
    method: 'PATCH',
    body: payload,
  })

export const deleteSavedSet = (workspace: string, setId: string, token: string) =>
  request<void>(setUrl(workspace, setId), token, 'delete this set', { method: 'DELETE' })

/** Adds items to a set. Items already in the set are skipped by the service. */
export const addSavedSetItems = (
  workspace: string,
  setId: string,
  items: SavedSetItemInput[],
  token: string,
) =>
  request<SavedSet>(`${setUrl(workspace, setId)}/items`, token, 'add items to this set', {
    method: 'POST',
    body: { items },
  })

export const removeSavedSetItem = (
  workspace: string,
  setId: string,
  entryId: string,
  token: string,
) =>
  request<void>(
    `${setUrl(workspace, setId)}/items/${encodeURIComponent(entryId)}`,
    token,
    'remove this item',
    { method: 'DELETE' },
  )
