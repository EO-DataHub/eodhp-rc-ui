import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { resolveItemRender, resolveTilesUrl } from '@/library/collectionRenderingConfig'
import { getItemTileTokenType } from '@/library/tileAuth'
import { useAuthenticatedTileUrls } from '@/hooks/useAuthenticatedTileUrls'
import { useEffect, useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useWorkspaceToken } from '@/hooks/useWorkspaceToken'

export const RasterItemLayer = ({
  item,
  layerId,
  sourceId,
}: {
  item: Item
  layerId?: string
  sourceId?: string
}) => {
  // When on assets tab, resolve the tiles url when rendering
  const tilesUrl = item.tilesUrl ?? resolveTilesUrl(item, item.render)
  const { registerUrl, unregisterUrl } = useAuthenticatedTileUrls()
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)

  const tokenType = getItemTileTokenType(item)
  const needsAuth = tokenType !== undefined
  const needsWorkspaceToken = tokenType === 'workspace'

  // Fetch workspace tokens for user and job collection tile requests
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
    if (tokenType && isTokenReady) {
      registerUrl(baseUrl, tokenType)
      return () => unregisterUrl(baseUrl)
    }
  }, [tilesUrl, tokenType, isTokenReady, registerUrl, unregisterUrl])

  if (!tilesUrl) return null
  // Don't render until token is ready for authenticated requests
  if (needsAuth && !isTokenReady) return null

  // MapLibre rejects an explicit undefined zoom, so only pass zooms the render defines
  const minmaxZoom = resolveItemRender(item, item.render)?.minmax_zoom
  const zoomRange = minmaxZoom ? { minzoom: minmaxZoom[0], maxzoom: minmaxZoom[1] } : {}

  return (
    <Source id={sourceId} type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
      <Layer
        id={layerId}
        type="raster"
        {...zoomRange}
        paint={{
          'raster-opacity': item.mapRender?.opacity ?? 1,
        }}
      />
    </Source>
  )
}
