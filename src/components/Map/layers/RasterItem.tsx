import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { resolveTilesUrl, requiresAuthentication } from '@/library/collectionRenderingConfig'
import { useAuthenticatedTileUrls } from '@/hooks/useAuthenticatedTileUrls'
import { useEffect, useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useWorkspaceToken } from '@/hooks/useWorkspaceToken'

export const RasterItemLayer = ({ item, layerId }: { item: Item; layerId?: string }) => {
  // When on assets tab, resolve the tiles url when rendering
  const tilesUrl = item.tilesUrl ?? resolveTilesUrl(item, item.render, item.isUserCollection)
  const { registerUrl, unregisterUrl } = useAuthenticatedTileUrls()
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)

  const needsAuth = requiresAuthentication(item.render, item.isUserCollection ?? false)
  const needsWorkspaceToken = needsAuth && item.isUserCollection

  // Fetch workspace tokens for user collection tile requests
  const { data: workspaceTokensData } = useWorkspaceToken(
    currentWorkspace,
    token,
    userInfo?.sub,
    !!needsWorkspaceToken,
  )

  // Only register URL and render when token is available
  const isTokenReady = needsWorkspaceToken
    ? !!workspaceTokensData?.access
    : needsAuth
      ? !!token
      : true

  useEffect(() => {
    if (!tilesUrl) return

    // Extract base URL pattern (before coordinates or placeholders)
    const urlWithoutQuery = tilesUrl.split('?')[0]
    const baseUrl = urlWithoutQuery
      .replace(/\/\d+\/\d+\/\d+@\d+x?$/, '')
      .replace(/\/\d+\/\d+\/\d+$/, '')
      .replace(/\/\{z\}\/\{x\}\/\{y\}@\d+x?$/, '')
      .replace(/\/\{z\}\/\{x\}\/\{y\}$/, '')

    // Only register if auth is needed and token is ready
    if (needsAuth && isTokenReady) {
      const tokenType = item.isUserCollection ? 'workspace' : 'keycloak'
      registerUrl(baseUrl, tokenType)
      return () => unregisterUrl(baseUrl)
    }
  }, [tilesUrl, needsAuth, isTokenReady, item.isUserCollection, registerUrl, unregisterUrl])

  if (!tilesUrl) return null
  // Don't render until token is ready for authenticated requests
  if (needsAuth && !isTokenReady) return null

  return (
    <Source type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
      <Layer
        id={layerId}
        type="raster"
        paint={{
          'raster-opacity': item.mapRender?.opacity ?? 1,
        }}
      />
    </Source>
  )
}
