import { useEffect, useState } from 'react'

export type WorkspaceCategory = 'commercial' | 'research'

const DEFAULT_CATEGORY: WorkspaceCategory = 'commercial'

const storageKey = (workspace: string) => `mockWorkspaceCategory:${workspace}`

const readStored = (workspace: string): WorkspaceCategory =>
  localStorage.getItem(storageKey(workspace)) === 'research' ? 'research' : DEFAULT_CATEGORY

/**
 * There's no real workspace-category API yet (see docs/pending-backend-apis.md and the
 * credits-ledger design docs) — state is stored in localStorage per workspace so this can
 * demo the intended UX. Real workspaces default to a category until a hub_admin manually
 * classifies them; the mock mirrors that with DEFAULT_CATEGORY.
 */
export const useMockWorkspaceCategory = (workspace: string | undefined) => {
  const [category, setCategory] = useState<WorkspaceCategory>(() =>
    workspace ? readStored(workspace) : DEFAULT_CATEGORY,
  )

  useEffect(() => {
    setCategory(workspace ? readStored(workspace) : DEFAULT_CATEGORY)
  }, [workspace])

  const setWorkspaceCategory = (next: WorkspaceCategory) => {
    if (!workspace) return
    localStorage.setItem(storageKey(workspace), next)
    setCategory(next)
  }

  return { category, setWorkspaceCategory }
}

export const getMockWorkspaceCategory = (workspace: string): WorkspaceCategory =>
  readStored(workspace)

export const setMockWorkspaceCategory = (workspace: string, category: WorkspaceCategory) => {
  localStorage.setItem(storageKey(workspace), category)
}
