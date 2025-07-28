import React, { useContext, useEffect } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useQuery } from '@tanstack/react-query'
import { fetchThumbnailImage } from '@/library/fetchQuicklookImage'
import DefaultItemThumbnail from '@/assets/icons/default-thumbnail-square.jpg'

interface AuthenticatedThumbnailProps {
  thumbnailUrl: string
  className?: string
}

const AuthenticatedThumbnail: React.FC<AuthenticatedThumbnailProps> = ({
  thumbnailUrl,
  className,
}) => {
  const { token } = useContext(AuthenticationContext)

  const { data: imageUrl, error } = useQuery<string | undefined>({
    queryKey: ['thumbnail', thumbnailUrl, token],
    queryFn: () =>
      thumbnailUrl && token
        ? fetchThumbnailImage({ url: thumbnailUrl, token })
        : Promise.resolve(undefined),
    enabled: !!(thumbnailUrl && token),
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

  // If no token or error, fall back to direct image loading (which will use default on error)
  if (!token || error) {
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
