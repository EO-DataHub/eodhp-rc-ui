import React, { useContext, useEffect, useMemo } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useQuery } from '@tanstack/react-query'
import { fetchThumbnailImage, fetchQuicklookImage } from '@/library/fetchQuicklookImage'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import DefaultItemThumbnail from '@/assets/icons/default-thumbnail-square.jpg'

interface AuthenticatedThumbnailProps {
  thumbnailUrl: string
  className?: string
  requiresAuth?: boolean
  isPurchasedItem?: boolean
}

const AuthenticatedThumbnail: React.FC<AuthenticatedThumbnailProps> = ({
  thumbnailUrl,
  className,
  requiresAuth = false,
  isPurchasedItem = false,
}) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)

  // Check if thumbnail is a TIF file
  const isTiffThumbnail = useMemo(() => {
    const urlLower = thumbnailUrl.toLowerCase()
    return urlLower.endsWith('.tif') || urlLower.endsWith('.tiff')
  }, [thumbnailUrl])

  // Fetch workspace-scoped tokens for purchased items
  const needsWorkspaceToken = isPurchasedItem && !!currentWorkspace && !!token && requiresAuth

  const { data: workspaceTokensData } = useQuery({
    queryKey: ['WorkspaceTokens', currentWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: needsWorkspaceToken,
  })

  // Determine which token to use: workspace-scoped token for purchased items when available,
  // otherwise fall back to regular JWT token
  const authToken = useMemo(() => {
    if (!requiresAuth || !token) {
      return undefined
    }
    // For purchased items, we need workspace-scoped token
    if (needsWorkspaceToken) {
      return workspaceTokensData?.access
    }
    return token
  }, [requiresAuth, token, needsWorkspaceToken, workspaceTokensData])

  // Determine if the image query should be enabled
  // If we need a workspace token, wait for it to be available
  const isImageQueryEnabled = useMemo(() => {
    if (!thumbnailUrl || !requiresAuth) {
      return false
    }
    if (needsWorkspaceToken) {
      return !!workspaceTokensData?.access
    }
    return !!token
  }, [thumbnailUrl, requiresAuth, needsWorkspaceToken, workspaceTokensData, token])

  const { data: imageUrl, error } = useQuery<string | undefined>({
    queryKey: ['thumbnail', thumbnailUrl, authToken, isTiffThumbnail, isPurchasedItem],
    queryFn: () => {
      if (!thumbnailUrl || !authToken) {
        return Promise.resolve(undefined)
      }
      // Use fetchQuicklookImage for TIF files (handles TIF decoding and auth)
      // Use fetchThumbnailImage for regular images
      return isTiffThumbnail
        ? fetchQuicklookImage({ url: thumbnailUrl, token: authToken })
        : fetchThumbnailImage({ url: thumbnailUrl, token: authToken })
    },
    enabled: isImageQueryEnabled,
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

  // If no token or error, fall back to direct image loading (which will use default on error)
  if (!authToken || error) {
    return (
      <img
        src={thumbnailUrl || DefaultItemThumbnail}
        className={className}
        onError={handleImageError}
      />
    )
  }

  // If we have an authenticated image URL, use it
  if (imageUrl) {
    return <img src={imageUrl} className={className} onError={handleImageError} />
  }

  // Loading state - show default thumbnail
  return <img src={DefaultItemThumbnail} className={className} />
}

export default AuthenticatedThumbnail
