import { useState, useEffect, useCallback } from 'react'
import type { ProcessRecord } from '@/types'
import { fetchItems, fetchItemById } from '@/services/processCatalogueService'
import { launchNotebook } from '@/services/notebookLaunchService'
import {
  buildNotebookVariables,
  getMissingVariables,
  type NotebookLaunchContext,
} from '@/services/notebookVariableResolvers'
import { getNotebookTemplateUrl } from '@/library/integrationTools'

export interface UseNotebookLaunchParams {
  /** Fetch the notebook list only when true, e.g. once there's an item or the dialog is open. */
  enabled: boolean
  /** Only fetch notebooks that list this collection. */
  applicableCollections?: string
  /** Narrows the fetched notebooks. Pass a stable (module-level) function. */
  filterNotebooks: (record: ProcessRecord) => boolean
  /** Select the notebook automatically when it's the only one. */
  autoSelectSingle?: boolean
  context: NotebookLaunchContext | null
  token: string | undefined
  currentWorkspace: string | undefined
  username: string | undefined
}

export interface UseNotebookLaunchResult {
  notebooks: ProcessRecord[]
  selectedNotebook: ProcessRecord | null
  setSelectedNotebook: (n: ProcessRecord | null) => void
  launch: () => Promise<void>
  isLoadingNotebooks: boolean
  isLaunching: boolean
  notebooksError: string | null
  launchError: string | null
  retry: () => void
}

/**
 * Opens a blank tab straight away, while the click still counts as user activation.
 * Browsers block window.open once the launch request has been awaited.
 */
function openPendingTab(): Window | null {
  const tab = window.open('', '_blank')
  if (!tab) return null
  tab.opener = null
  try {
    tab.document.title = 'Opening Jupyter…'
    tab.document.body.textContent = 'Preparing your notebook…'
  } catch {
    // The placeholder text is cosmetic.
  }
  return tab
}

export function useNotebookLaunch({
  enabled,
  applicableCollections,
  filterNotebooks,
  autoSelectSingle = false,
  context,
  token,
  currentWorkspace,
  username,
}: UseNotebookLaunchParams): UseNotebookLaunchResult {
  const [notebooks, setNotebooks] = useState<ProcessRecord[]>([])
  const [selectedNotebook, setSelectedNotebook] = useState<ProcessRecord | null>(null)
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false)
  const [notebooksError, setNotebooksError] = useState<string | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const loadNotebooks = useCallback(async () => {
    if (!enabled) {
      setNotebooks([])
      setNotebooksError(null)
      setLaunchError(null)
      return
    }

    setIsLoadingNotebooks(true)
    setNotebooksError(null)
    setLaunchError(null)

    const { data, error } = await fetchItems({
      type: 'notebook',
      applicableCollections,
      page: 1,
      pageSize: 50,
    })

    setIsLoadingNotebooks(false)

    if (error) {
      setNotebooksError(error)
      setNotebooks([])
      setSelectedNotebook(null)
      return
    }

    const items = (data?.items ?? []).filter(filterNotebooks)
    setNotebooks(items)
    setNotebooksError(null)
    setSelectedNotebook(autoSelectSingle && items.length === 1 ? items[0] : null)
  }, [enabled, applicableCollections, filterNotebooks, autoSelectSingle])

  useEffect(() => {
    void loadNotebooks()
  }, [loadNotebooks])

  const launch = useCallback(async () => {
    if (!context || !selectedNotebook || !token || !currentWorkspace || !username) return

    setLaunchError(null)
    const tab = openPendingTab()
    setIsLaunching(true)

    try {
      // List items don't include links; fetch full item to get template URL (rel="template")
      const { data: detail, error: fetchError } = await fetchItemById(selectedNotebook.id)
      if (fetchError != null || detail == null) {
        throw new Error(fetchError ?? 'Could not load notebook details. Please try again.')
      }

      const templateUrl = getNotebookTemplateUrl(detail)
      if (!templateUrl) {
        throw new Error('Notebook template URL not found. Please contact support.')
      }

      const inputParameterKeys =
        selectedNotebook.properties?.type === 'notebook'
          ? Object.keys(detail?.properties?.inputParameters ?? {})
          : []
      const variables = buildNotebookVariables(inputParameterKeys, context)
      if (getMissingVariables(inputParameterKeys, variables).length > 0) {
        throw new Error('Missing required data for notebook launch. Please try again.')
      }

      const requestPayload: Parameters<typeof launchNotebook>[0] = {
        workspace_name: currentWorkspace,
        username,
        action_name: selectedNotebook.id,
        template_url: templateUrl,
      }
      if (Object.keys(variables).length > 0) {
        requestPayload.variables = variables
      }

      const spawnUrl = await launchNotebook(requestPayload, token)

      if (tab) {
        tab.location.href = spawnUrl
      } else {
        window.open(spawnUrl, '_blank')
      }
    } catch (err) {
      tab?.close()
      setLaunchError(
        err instanceof Error ? err.message : 'Failed to launch notebook. Please try again.',
      )
    } finally {
      setIsLaunching(false)
    }
  }, [context, selectedNotebook, token, currentWorkspace, username])

  const retry = useCallback(() => {
    void loadNotebooks()
  }, [loadNotebooks])

  return {
    notebooks,
    selectedNotebook,
    setSelectedNotebook,
    launch,
    isLoadingNotebooks,
    isLaunching,
    notebooksError,
    launchError,
    retry,
  }
}
