import { useState, useEffect, useCallback } from 'react'
import type { Collection, Item, ProcessRecord } from '@/types'
import { fetchItems, fetchItemById } from '@/services/processCatalogueService'
import { launchNotebook } from '@/services/notebookLaunchService'
import { getSelfLinkHref, getNotebookTemplateUrl } from '@/library/integrationTools'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

export interface UseNotebookLaunchParams {
  item: Item | null
  collection: Collection | undefined
  token: string | undefined
  currentWorkspace: string | undefined
  username: string | undefined
}

export interface UseNotebookLaunchResult {
  notebooks: ProcessRecord[]
  selectedNotebook: ProcessRecord | null
  setSelectedNotebook: (n: ProcessRecord | null) => void
  launch: (includeAoi?: boolean) => Promise<void>
  isLoadingNotebooks: boolean
  isLaunching: boolean
  notebooksError: string | null
  launchError: string | null
  retry: () => void
}

export function useNotebookLaunch({
  item,
  collection,
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

  // Retrieve AOI from store
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  const collectionUrl = collection ? getSelfLinkHref(collection) : undefined

  const loadNotebooks = useCallback(async () => {
    if (!item || !collectionUrl) {
      setNotebooks([])
      setNotebooksError(null)
      return
    }

    setIsLoadingNotebooks(true)
    setNotebooksError(null)

    const { data, error } = await fetchItems({
      type: 'notebook',
      applicableCollections: collectionUrl,
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

    const items = data?.items ?? []
    setNotebooks(items)
    setNotebooksError(null)
    setSelectedNotebook(null)
  }, [item, collectionUrl])

  useEffect(() => {
    void loadNotebooks()
  }, [loadNotebooks])

  const launch = useCallback(
    async (includeAoi = false) => {
      if (!item || !selectedNotebook || !token || !currentWorkspace || !username) return

      const stacItemLink = getSelfLinkHref(item)
      if (!stacItemLink) {
        setLaunchError('Missing required data for notebook launch. Please try again.')
        return
      }

      setIsLaunching(true)
      setLaunchError(null)

      try {
        // List items don't include links; fetch full item to get template URL (rel="application")
        const { data: detail, error: fetchError } = await fetchItemById(selectedNotebook.id)
        if (fetchError != null || detail == null) {
          setLaunchError(fetchError ?? 'Could not load notebook details. Please try again.')
          return
        }

        const templateUrl = getNotebookTemplateUrl(detail)
        if (!templateUrl) {
          setLaunchError('Notebook template URL not found. Please contact support.')
          return
        }

        // Include AOI only if user opted in AND AOI exists
        const requestPayload: Parameters<typeof launchNotebook>[0] = {
          stac_collection_name: item.collection,
          stac_item_link: stacItemLink,
          workspace_name: currentWorkspace,
          username,
          action_name: selectedNotebook.id,
          template_url: templateUrl,
        }

        if (includeAoi && aoi) {
          requestPayload.aoi = aoi
        }

        const spawnUrl = await launchNotebook(requestPayload, token)

        window.open(spawnUrl, '_blank')
      } catch (err) {
        setLaunchError(
          err instanceof Error ? err.message : 'Failed to launch notebook. Please try again.',
        )
      } finally {
        setIsLaunching(false)
      }
    },
    [item, selectedNotebook, token, currentWorkspace, username, aoi],
  )

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
