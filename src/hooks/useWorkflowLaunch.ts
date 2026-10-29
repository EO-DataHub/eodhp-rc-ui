import { useState, useEffect, useCallback } from 'react'
import type { Collection, Item, ProcessRecord } from '@/types'
import { fetchItems, fetchItemById } from '@/services/processCatalogueService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { buildWorkflowVariables } from '@/services/workflowVariableResolvers'
import {
  getHubApiOrigin,
  getSelfLinkHref,
  getWorkflowExecutionUrl,
} from '@/library/integrationTools'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

export interface UseWorkflowLaunchParams {
  item: Item | null
  collection: Collection | undefined
  token: string | undefined
  currentWorkspace: string | undefined
  username: string | undefined
}

export interface UseWorkflowLaunchResult {
  workflows: ProcessRecord[]
  selectedWorkflow: ProcessRecord | null
  setSelectedWorkflow: (w: ProcessRecord | null) => void
  launch: (
    includeAoi?: boolean,
    userProvidedVariables?: Record<string, string | number | boolean>,
  ) => Promise<void>
  isLoadingWorkflows: boolean
  isLaunching: boolean
  workflowsError: string | null
  launchError: string | null
  workflowId: string | null
  clearWorkflowId: () => void
  retry: () => void
}

export function useWorkflowLaunch({
  item,
  collection,
  token,
  currentWorkspace,
  username,
}: UseWorkflowLaunchParams): UseWorkflowLaunchResult {
  const [workflows, setWorkflows] = useState<ProcessRecord[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<ProcessRecord | null>(null)
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false)
  const [workflowsError, setWorkflowsError] = useState<string | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  // Retrieve AOI from store
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  // Use collection id as the key for applicableCollections filter in the process catalogue
  const collectionKey = collection?.id

  const loadWorkflows = useCallback(async () => {
    if (!item || !collectionKey) {
      setWorkflows([])
      setWorkflowsError(null)
      return
    }

    setIsLoadingWorkflows(true)
    setWorkflowsError(null)

    const { data, error } = await fetchItems({
      type: 'workflow',
      applicableCollections: collectionKey,
      page: 1,
      pageSize: 50,
    })

    setIsLoadingWorkflows(false)

    if (error) {
      setWorkflowsError(error)
      setWorkflows([])
      setSelectedWorkflow(null)
      return
    }

    const items = data?.items ?? []
    setWorkflows(items)
    setWorkflowsError(null)
    setSelectedWorkflow(null)
  }, [item, collectionKey])

  useEffect(() => {
    void loadWorkflows()
  }, [loadWorkflows])

  const launch = useCallback(
    async (
      includeAoi = false,
      userProvidedVariables?: Record<string, string | number | boolean>,
    ) => {
      if (!item || !selectedWorkflow || !token || !currentWorkspace || !username) return

      const stacItemLink = getSelfLinkHref(item)
      if (!stacItemLink) {
        setLaunchError('Missing required data for workflow launch. Please try again.')
        return
      }

      setIsLaunching(true)
      setLaunchError(null)
      setWorkflowId(null)

      try {
        // List items don't include links; fetch full item to get application-platform link
        const { data: detail, error: fetchError } = await fetchItemById(selectedWorkflow.id)
        if (fetchError != null || detail == null) {
          setLaunchError(fetchError ?? 'Could not load workflow details. Please try again.')
          return
        }

        const executionUrl = getWorkflowExecutionUrl(detail)
        if (!executionUrl) {
          setLaunchError('Workflow execution URL not found. Please contact support.')
          return
        }

        const inputParameters =
          selectedWorkflow.properties?.type === 'workflow'
            ? detail?.properties?.inputParameters ?? {}
            : {}
        const context = {
          item,
          aoi,
          includeAoi,
          workspace: currentWorkspace,
          apiBaseUrl: getHubApiOrigin(),
        }
        const resolvedVariables = buildWorkflowVariables(inputParameters, context)
        const paramKeys = new Set(Object.keys(inputParameters))
        const filteredUserVars =
          userProvidedVariables &&
          Object.fromEntries(
            Object.entries(userProvidedVariables).filter(([key]) => paramKeys.has(key)),
          )
        const variables = {
          ...resolvedVariables,
          ...filteredUserVars,
        }

        // Fetch workspace-scoped token for user-specific workflow execution endpoint
        let workspaceToken: string
        try {
          const workspaceTokens = await fetchWorkspaceTokens(currentWorkspace, token)
          workspaceToken = workspaceTokens.access
        } catch (err) {
          setLaunchError(
            err instanceof Error
              ? err.message
              : 'Failed to obtain workspace token. Please try again.',
          )
          return
        }

        const response = await launchWorkflow(executionUrl, variables, workspaceToken)

        // Store workflow/job id for success view (service normalizes workflowId from API response)
        const id = response.workflowId?.trim()
        setWorkflowId(id ? id : null)
        setLaunchError(null)
      } catch (err) {
        setLaunchError(
          err instanceof Error ? err.message : 'Failed to launch workflow. Please try again.',
        )
        setWorkflowId(null)
      } finally {
        setIsLaunching(false)
      }
    },
    [item, selectedWorkflow, token, currentWorkspace, username, aoi],
  )

  const retry = useCallback(() => {
    void loadWorkflows()
  }, [loadWorkflows])

  const clearWorkflowId = useCallback(() => {
    setWorkflowId(null)
  }, [])

  return {
    workflows,
    selectedWorkflow,
    setSelectedWorkflow,
    launch,
    isLoadingWorkflows,
    isLaunching,
    workflowsError,
    launchError,
    workflowId,
    clearWorkflowId,
    retry,
  }
}
