import React, { useContext, useEffect } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useQuery } from '@tanstack/react-query'
import { fetchThumbnailImage } from '@/library/fetchQuicklookImage'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import DefaultItemThumbnail from '@/assets/icons/default-thumbnail-square.jpg'

interface AuthenticatedThumbnailProps {
  thumbnailUrl: string
  className?: string
  requiresAuth?: boolean
  isUserCollection?: boolean
  isJobCollection?: boolean
  workspaceToken?: string
}

const AuthenticatedThumbnail: React.FC<AuthenticatedThumbnailProps> = ({
  thumbnailUrl,
  className,
  requiresAuth = false,
  isUserCollection = false,
  isJobCollection = false,
  workspaceToken,
}) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)

  // For job collections, use provided workspaceToken if available
  // For user collections, fetch workspace tokens
  const needsWorkspaceToken = requiresAuth && isUserCollection && !isJobCollection

  // Fetch workspace tokens for user collection thumbnail requests
  const { data: workspaceTokensData } = useQuery({
    queryKey: ['WorkspaceTokens', currentWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!token && needsWorkspaceToken,
  })

  // Determine which token to use
  // Priority: workspaceToken prop (for job collections) > workspaceTokensData (for user collections) > token
  const authToken =
    isJobCollection && workspaceToken
      ? workspaceToken
      : needsWorkspaceToken
        ? workspaceTokensData?.access
        : token

  const isTokenReady = isJobCollection
    ? !!workspaceToken
    : needsWorkspaceToken
      ? !!workspaceTokensData?.access
      : requiresAuth
        ? !!token
        : true

  const { data: imageUrl, error } = useQuery<string | undefined>({
    queryKey: ['thumbnail', thumbnailUrl, authToken],
    queryFn: () =>
      thumbnailUrl && authToken
        ? fetchThumbnailImage({ url: thumbnailUrl, token: authToken })
        : Promise.resolve(undefined),
    enabled: !!(thumbnailUrl && isTokenReady && requiresAuth),
  })

  // Revoke object URL when imageUrl changes or component unmounts
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = DefaultItemThumbnail
  }

  // If no thumbnail URL provided, show default
  if (!thumbnailUrl) {
    return <img src={DefaultItemThumbnail} className={className} />
  }

  // If authentication is not required, load directly
  if (!requiresAuth) {
    return (
      <img
        src={thumbnailUrl || DefaultItemThumbnail}
        className={className}
        onError={handleImageError}
      />
    )
  }

  // If authentication is required but no token or error occurred, show default thumbnail
  // Don't try to load directly as it will fail with 403
  if (!isTokenReady || error) {
    return <img src={DefaultItemThumbnail} className={className} />
  }

  // If we have an authenticated image URL, use it
  if (imageUrl) {
    return <img src={imageUrl} className={className} onError={handleImageError} />
  }

  // Loading state - show default thumbnail
  return <img src={DefaultItemThumbnail} className={className} />
}

export default AuthenticatedThumbnail
