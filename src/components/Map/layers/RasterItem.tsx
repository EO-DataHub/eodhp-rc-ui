/* eslint-disable no-console */
import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { resolveTilesUrl, requiresAuthentication } from '@/library/collectionRenderingConfig'
import { useAuthenticatedTileUrls } from '@/hooks/useAuthenticatedTileUrls'
import { useEffect, useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { extractWorkspaceFromCollection } from '@/library/catalogUtils'

export const RasterItemLayer = ({ item }: { item: Item }) => {
  console.log('[RasterItemLayer] Render start', {
    itemId: item.id,
    pinId: item.pinId,
    selectedAssetKey: item.selectedAssetKey,
    hasTilesUrl: !!item.tilesUrl,
    hasRender: !!item.render,
    isUserCollection: item.isUserCollection,
    collectionRef: item.collectionRef,
  })

  // When on assets tab, resolve the tiles url when rendering
  const tilesUrl =
    item.tilesUrl ??
    resolveTilesUrl(item, item.render, item.isUserCollection, item.selectedAssetKey)

  console.log('[RasterItemLayer] tilesUrl resolved', {
    tilesUrl,
    itemTilesUrl: item.tilesUrl,
    resolvedTilesUrl: resolveTilesUrl(
      item,
      item.render,
      item.isUserCollection,
      item.selectedAssetKey,
    ),
  })

  const { registerUrl, unregisterUrl } = useAuthenticatedTileUrls()
  const { token, currentWorkspace, isAuthenticated } = useContext(AuthenticationContext)

  const isJobCollection = item.collectionRef?.isJobCollection ?? false
  // Job collections always require authentication
  const needsAuth =
    isJobCollection || requiresAuthentication(item.render, item.isUserCollection ?? false)
  const collectionWorkspace = isJobCollection
    ? extractWorkspaceFromCollection(item.collectionRef!)
    : null
  const needsWorkspaceToken = needsAuth && ((item.isUserCollection ?? false) || isJobCollection)
  const targetWorkspace = isJobCollection ? collectionWorkspace ?? null : currentWorkspace

  console.log('[RasterItemLayer] Auth check', {
    needsAuth,
    isJobCollection,
    collectionWorkspace,
    needsWorkspaceToken,
    targetWorkspace,
    currentWorkspace,
    isAuthenticated,
    hasToken: !!token,
  })

  // Fetch workspace tokens for user collection and job collection tile requests
  const { data: workspaceTokensData } = useQuery({
    queryKey: ['WorkspaceTokens', targetWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(targetWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: !!targetWorkspace && !!token && needsWorkspaceToken && isAuthenticated,
  })

  console.log('[RasterItemLayer] Workspace tokens query', {
    enabled: !!targetWorkspace && !!token && needsWorkspaceToken && isAuthenticated,
    hasWorkspaceTokensData: !!workspaceTokensData,
    workspaceTokensAccess: workspaceTokensData?.access ? 'present' : 'missing',
  })

  // Only register URL and render when token is available
  const isTokenReady = needsWorkspaceToken
    ? !!workspaceTokensData?.access
    : needsAuth
      ? !!token
      : true

  console.log('[RasterItemLayer] Token ready check', {
    needsWorkspaceToken,
    hasWorkspaceTokensAccess: !!workspaceTokensData?.access,
    needsAuth,
    hasToken: !!token,
    isTokenReady,
  })

  useEffect(() => {
    console.log('[RasterItemLayer] useEffect triggered', {
      tilesUrl,
      needsAuth,
      isTokenReady,
      isJobCollection,
      isUserCollection: item.isUserCollection,
    })

    if (!tilesUrl) {
      console.log('[RasterItemLayer] useEffect: No tilesUrl, returning early')
      return
    }

    // Extract base URL pattern (before coordinates or placeholders)
    const urlWithoutQuery = tilesUrl.split('?')[0]
    const baseUrl = urlWithoutQuery
      .replace(/\/\d+\/\d+\/\d+@\d+x?$/, '')
      .replace(/\/\d+\/\d+\/\d+$/, '')
      .replace(/\/\{z\}\/\{x\}\/\{y\}@\d+x?$/, '')
      .replace(/\/\{z\}\/\{x\}\/\{y\}$/, '')

    console.log('[RasterItemLayer] useEffect: Base URL extracted', {
      tilesUrl,
      urlWithoutQuery,
      baseUrl,
    })

    // Only register if auth is needed and token is ready
    if (needsAuth && isTokenReady) {
      const tokenType = isJobCollection
        ? 'workspace'
        : item.isUserCollection
          ? 'workspace'
          : 'keycloak'
      const workspace = isJobCollection
        ? collectionWorkspace
        : item.isUserCollection
          ? currentWorkspace
          : undefined
      console.log('[RasterItemLayer] useEffect: Registering URL', {
        baseUrl,
        tokenType,
        workspace,
      })
      registerUrl(baseUrl, tokenType, workspace ?? undefined)
      return () => {
        console.log('[RasterItemLayer] useEffect: Unregistering URL', { baseUrl })
        unregisterUrl(baseUrl)
      }
    } else {
      console.log('[RasterItemLayer] useEffect: Not registering URL', {
        needsAuth,
        isTokenReady,
        reason: !needsAuth ? 'no auth needed' : !isTokenReady ? 'token not ready' : 'unknown',
      })
    }
  }, [
    tilesUrl,
    needsAuth,
    isTokenReady,
    item.isUserCollection,
    isJobCollection,
    collectionWorkspace,
    currentWorkspace,
    registerUrl,
    unregisterUrl,
  ])

  if (!tilesUrl) {
    console.log('[RasterItemLayer] Early return: No tilesUrl')
    return null
  }
  // Don't render until token is ready for authenticated requests
  if (needsAuth && !isTokenReady) {
    console.log('[RasterItemLayer] Early return: Auth needed but token not ready', {
      needsAuth,
      isTokenReady,
    })
    return null
  }

  const sourceKey = `raster-${item.pinId ?? item.id}-${item.selectedAssetKey ?? 'default'}-${tilesUrl}`
  console.log('[RasterItemLayer] Rendering Source component', {
    sourceKey,
    tilesUrl,
    bounds: item.bbox,
  })

  // Use tilesUrl and selectedAssetKey in key to force Source remount when asset changes
  // This ensures React Map GL fetches new tiles when the asset selection changes
  return (
    <Source key={sourceKey} type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
      <Layer
        type="raster"
        paint={{
          'raster-opacity': item.mapRender?.opacity ?? 1,
        }}
      />
    </Source>
  )
}
