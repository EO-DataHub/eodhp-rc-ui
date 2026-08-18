import { useEffect, useState } from 'react'

export interface WorkspaceIntegrations {
  daskEnabled: boolean
  gpuEnabled: boolean
}

const DEFAULT_INTEGRATIONS: WorkspaceIntegrations = {
  daskEnabled: false,
  gpuEnabled: false,
}

const storageKey = (workspace: string) => `mockWorkspaceIntegrations:${workspace}`

const readStored = (workspace: string): WorkspaceIntegrations => {
  try {
    const raw = localStorage.getItem(storageKey(workspace))
    if (raw) return { ...DEFAULT_INTEGRATIONS, ...(JSON.parse(raw) as WorkspaceIntegrations) }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_INTEGRATIONS
}

const writeStored = (workspace: string, integrations: WorkspaceIntegrations) => {
  localStorage.setItem(storageKey(workspace), JSON.stringify(integrations))
}

/**
 * There's no real workspace-integrations API yet (see docs/pending-backend-apis.md) —
 * state is stored in localStorage per workspace, same as workspace category. Both Dask
 * and GPU integration default to disabled until a hub_admin turns them on.
 */
export const useMockWorkspaceIntegrations = (workspace: string | undefined) => {
  const [integrations, setIntegrations] = useState<WorkspaceIntegrations>(() =>
    workspace ? readStored(workspace) : DEFAULT_INTEGRATIONS,
  )

  useEffect(() => {
    setIntegrations(workspace ? readStored(workspace) : DEFAULT_INTEGRATIONS)
  }, [workspace])

  const setIntegration = (key: keyof WorkspaceIntegrations, value: boolean) => {
    if (!workspace) return
    setIntegrations((prev) => {
      const next = { ...prev, [key]: value }
      writeStored(workspace, next)
      return next
    })
  }

  return { integrations, setIntegration }
}
