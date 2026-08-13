import { useEffect, useState } from 'react'
import { WorkspaceMember } from '@/services/workspaceMembersService'

interface StoredRoles {
  owner: string | null
  admins: string[]
}

const storageKey = (workspace: string) => `mockWorkspaceRoles:${workspace}`

const readStored = (workspace: string): StoredRoles => {
  try {
    const raw = localStorage.getItem(storageKey(workspace))
    if (raw) return JSON.parse(raw) as StoredRoles
  } catch {
    // ignore malformed storage
  }
  return { owner: null, admins: [] }
}

const writeStored = (workspace: string, roles: StoredRoles) => {
  localStorage.setItem(storageKey(workspace), JSON.stringify(roles))
}

/**
 * There's no real workspace_admins/owner API yet (see the "Implement multi-admin
 * permission-model support" task note) — role state is stored in localStorage per
 * workspace so the Members page can demo the intended UX without calling any API.
 * The owner defaults to the current user the first time a workspace's members load.
 */
export const useMockWorkspaceRoles = (
  workspace: string | undefined,
  members: WorkspaceMember[] | undefined,
  currentUsername: string | undefined,
) => {
  const [roles, setRoles] = useState<StoredRoles>(() =>
    workspace ? readStored(workspace) : { owner: null, admins: [] },
  )

  useEffect(() => {
    setRoles(workspace ? readStored(workspace) : { owner: null, admins: [] })
  }, [workspace])

  useEffect(() => {
    if (!workspace || roles.owner !== null || !members || members.length === 0) return
    const defaultOwner =
      members.find((member) => member.username === currentUsername)?.username ?? members[0].username
    const seeded: StoredRoles = { owner: defaultOwner, admins: roles.admins }
    setRoles(seeded)
    writeStored(workspace, seeded)
  }, [workspace, members, currentUsername, roles.owner, roles.admins])

  const toggleAdmin = (username: string) => {
    if (!workspace) return
    setRoles((prev) => {
      const admins = prev.admins.includes(username)
        ? prev.admins.filter((admin) => admin !== username)
        : [...prev.admins, username]
      const next: StoredRoles = { ...prev, admins }
      writeStored(workspace, next)
      return next
    })
  }

  const transferOwnership = (newOwner: string) => {
    if (!workspace) return
    setRoles((prev) => {
      const previousOwner = prev.owner
      const admins = prev.admins.filter((admin) => admin !== newOwner)
      if (previousOwner && previousOwner !== newOwner && !admins.includes(previousOwner)) {
        admins.push(previousOwner)
      }
      const next: StoredRoles = { owner: newOwner, admins }
      writeStored(workspace, next)
      return next
    })
  }

  return {
    owner: roles.owner,
    admins: roles.admins,
    toggleAdmin,
    transferOwnership,
  }
}
