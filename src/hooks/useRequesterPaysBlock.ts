import { useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { isRequesterPaysCollection } from '@/library/collectionRenderingConfig'

/**
 * Why the user can't download from this collection yet, or `null` if they can.
 *
 * Requester-pays data is charged to a workspace, so the data proxy refuses an anonymous
 * download (401), and refuses one that doesn't name a workspace when the user belongs to
 * several (400). Downloads name the workspace selected in the header, so one must be selected.
 */
export type RequesterPaysBlock = 'sign-in' | 'select-workspace' | null

export const useRequesterPaysBlock = (
  collectionId: string | undefined,
  isUserCollection = false,
): RequesterPaysBlock => {
  const { isAuthenticated, currentWorkspace } = useContext(AuthenticationContext)
  if (isUserCollection || !collectionId || !isRequesterPaysCollection(collectionId)) return null
  if (!isAuthenticated) return 'sign-in'
  if (!currentWorkspace) return 'select-workspace'
  return null
}
