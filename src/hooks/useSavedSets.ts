import { useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { fetchWorkspaceAdmins } from '@/services/workspaceMembersService'
import {
  CreateSavedSetPayload,
  SavedSetItemInput,
  SavedSetSummary,
  UpdateSavedSetPayload,
  addSavedSetItems,
  createSavedSet,
  deleteSavedSet,
  fetchSavedSet,
  fetchSavedSets,
  removeSavedSetItem,
  updateSavedSet,
} from '@/services/savedSetsService'

const NOT_SIGNED_IN = 'You must be signed in and have a workspace selected to use saved sets.'

export const savedSetsKey = (workspace?: string) => ['SavedSets', workspace]
export const savedSetKey = (workspace?: string, setId?: string) => ['SavedSet', workspace, setId]

export const useSavedSets = (enabled = true) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  return useQuery({
    queryKey: savedSetsKey(currentWorkspace),
    queryFn: () => fetchSavedSets(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(enabled && token && currentWorkspace),
  })
}

export const useSavedSet = (setId?: string) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  return useQuery({
    queryKey: savedSetKey(currentWorkspace, setId),
    queryFn: () => fetchSavedSet(currentWorkspace!, setId!, token!),
    refetchOnWindowFocus: false,
    retry: false,
    enabled: Boolean(token && currentWorkspace && setId),
  })
}

/**
 * Mutations for the current workspace's saved sets. Each one refreshes the set list and the
 * changed set, so item counts and "updated" dates stay right.
 */
export const useSavedSetMutations = () => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const queryClient = useQueryClient()

  const withAuth = <T>(fn: (workspace: string, token: string) => Promise<T>) => {
    if (!token || !currentWorkspace) return Promise.reject(new Error(NOT_SIGNED_IN))
    return fn(currentWorkspace, token)
  }

  const invalidate = (setId?: string) => {
    void queryClient.invalidateQueries({ queryKey: savedSetsKey(currentWorkspace) })
    if (setId) {
      void queryClient.invalidateQueries({ queryKey: savedSetKey(currentWorkspace, setId) })
    }
  }

  const create = useMutation({
    mutationFn: (payload: CreateSavedSetPayload) =>
      withAuth((ws, t) => createSavedSet(ws, payload, t)),
    onSuccess: (set) => invalidate(set.id),
  })

  const update = useMutation({
    mutationFn: ({ setId, payload }: { setId: string; payload: UpdateSavedSetPayload }) =>
      withAuth((ws, t) => updateSavedSet(ws, setId, payload, t)),
    onSuccess: (set) => invalidate(set.id),
  })

  const remove = useMutation({
    mutationFn: ({ setId }: { setId: string }) => withAuth((ws, t) => deleteSavedSet(ws, setId, t)),
    onSuccess: (_data, { setId }) => {
      queryClient.removeQueries({ queryKey: savedSetKey(currentWorkspace, setId) })
      invalidate()
    },
  })

  // Reads the set just before adding, so `added` counts what this request added, not what
  // other members added since the cached set list loaded.
  const addItems = useMutation({
    mutationFn: ({ setId, items }: { setId: string; items: SavedSetItemInput[] }) =>
      withAuth(async (ws, t) => {
        const before = await fetchSavedSet(ws, setId, t)
        const existing = new Set(before.items.map((item) => item.selfHref))
        const set = await addSavedSetItems(ws, setId, items, t)
        const saved = new Set(set.items.map((item) => item.selfHref))
        const added = items.filter(
          (item) => !existing.has(item.selfHref) && saved.has(item.selfHref),
        ).length
        return { set, added }
      }),
    onSuccess: ({ set }) => invalidate(set.id),
  })

  const removeItem = useMutation({
    mutationFn: ({ setId, entryId }: { setId: string; entryId: string }) =>
      withAuth((ws, t) => removeSavedSetItem(ws, setId, entryId, t)),
    onSuccess: (_data, { setId }) => invalidate(setId),
  })

  // One DELETE per item rather than a PUT of the remaining list, so items other members added
  // since this page loaded aren't overwritten.
  const removeItems = useMutation({
    mutationFn: ({ setId, entryIds }: { setId: string; entryIds: string[] }) =>
      withAuth(async (ws, t) => {
        const results = await Promise.allSettled(
          entryIds.map((entryId) => removeSavedSetItem(ws, setId, entryId, t)),
        )
        const failed = results.filter((r) => r.status === 'rejected').length
        if (failed > 0) {
          throw new Error(`${failed} of ${entryIds.length} items couldn't be removed.`)
        }
      }),
    onSettled: (_data, _error, { setId }) => invalidate(setId),
  })

  return { create, update, remove, addItems, removeItem, removeItems }
}

/**
 * Whether the current user can change a set: its creator, the workspace owner or a workspace
 * admin. The service enforces the same rule; this only decides which actions to show.
 * Shares the Members page cache key for the admin list.
 */
export const useCanEditSavedSet = () => {
  const { token, userInfo, workspaceUserName, currentWorkspace } = useContext(AuthenticationContext)
  const { data: workspaces } = useWorkspaces(token, userInfo?.sub)
  const isOwner = Boolean(
    workspaceUserName &&
      workspaces?.some((w) => w.name === currentWorkspace && w.owner === workspaceUserName),
  )

  const { data: admins, isLoading } = useQuery({
    queryKey: ['WorkspaceAdmins', currentWorkspace, userInfo?.sub],
    queryFn: () => fetchWorkspaceAdmins(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    // One retry, so a single network blip doesn't hide admin actions for the whole session.
    retry: 1,
    enabled: Boolean(token && currentWorkspace && workspaceUserName && !isOwner),
  })
  const isAdmin = isOwner || Boolean(workspaceUserName && admins?.includes(workspaceUserName))

  const canEdit = (set: Pick<SavedSetSummary, 'createdBy'>) =>
    Boolean(workspaceUserName && (isAdmin || set.createdBy === workspaceUserName))
  return { canEdit, isLoading }
}
