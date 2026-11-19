import { useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { isRequesterPaysCollection } from '@/library/collectionRenderingConfig'

/**
 * Whether the user must sign in before downloading from this collection: requester-pays data
 * is charged to a workspace, so the data proxy refuses anonymous downloads (401).
 */
export const useRequesterPaysSignInRequired = (
  collectionId: string | undefined,
  isUserCollection = false,
): boolean => {
  const { isAuthenticated } = useContext(AuthenticationContext)
  return (
    !isAuthenticated &&
    !isUserCollection &&
    !!collectionId &&
    isRequesterPaysCollection(collectionId)
  )
}
