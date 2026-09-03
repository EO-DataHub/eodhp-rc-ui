import { useRef, useState, useEffect, useMemo, useContext, useCallback } from 'react'
import { useSelector } from '@xstate/store/react'
import { useItemsQuery } from '@/hooks/useItemsQuery'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import centroid from '@turf/centroid'
import area from '@turf/area'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useAuthenticatedTileUrls } from '@/hooks/useAuthenticatedTileUrls'
import { useWorkspaceToken } from '@/hooks/useWorkspaceToken'

import Maplibre, { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import PinnedItemsLayer from './layers/PinnedItems'
import QueryItemsLayer from './layers/QueryItems'
import HoveredItemLayer from './layers/HoveredItem'
import { RestoreAOIDialog } from './RestoreAOIDialog'
import { TerraDrawControl } from './TerraDrawControl'
import { DrawingToolbar } from './DrawingToolbar'
import { AreaTooltip } from './AreaTooltip'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

const MAP_STORAGE_KEY = 'mapViewState'

export const Map = () => {
  const mapRef = useRef<MapRef>(null)
  const terraDrawControlRef = useRef<{
    delete: () => void
    add: (feature: GeoJSON.Feature) => void
    isDrawing: () => boolean
  } | null>(null)
  const { pageItems } = useItemsQuery()
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)
  const { isAuthenticated, getTokenType } = useAuthenticatedTileUrls()

  // Fetch workspace tokens for user collection tile requests
  const { data: workspaceTokensData } = useWorkspaceToken(currentWorkspace, token, userInfo?.sub)

  // Use refs to ensure transformRequest always has access to the latest token values
  const tokenRef = useRef<string | undefined>(token)
  const workspaceTokenRef = useRef<string | undefined>(workspaceTokensData?.access)

  // Keep refs in sync with token values
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    workspaceTokenRef.current = workspaceTokensData?.access
  }, [workspaceTokensData?.access])

  // Load previous map state from local storage, or use default
  const savedViewState =
    JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) ?? 'null') || DEFAULT_MAP_VIEW
  const [viewState, setViewState] = useState(savedViewState)
  const [drawMode, setDrawMode] = useState<'rectangle' | 'polygon' | null>(null)
  const [realTimeArea, setRealTimeArea] = useState<number | null>(null)
  const [aoiCenterPosition, setAoiCenterPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const mapInstance = useSelector(dataFinderStore, (state) => state.context.mapInstance)
  const initialBounds = useSelector(dataFinderStore, (state) => state.context.initialBounds)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  // Apply permalink initial bounds when map is ready
  useEffect(() => {
    if (!mapInstance || !initialBounds) return
    const [west, south, east, north] = initialBounds
    mapInstance.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 20, duration: 300 },
    )
    dataFinderStore.send({ type: 'clearInitialBounds' })
  }, [mapInstance, initialBounds])

  // Calculate AOI area from the feature
  const aoiArea = useMemo(() => {
    if (!aoi) return null
    try {
      // Convert area from square meters to square kilometers
      return area(aoi) / 1000000
    } catch {
      return null
    }
  }, [aoi])

  // Derive isDrawing from TerraDraw's actual state
  useEffect(() => {
    if (!terraDrawControlRef.current) {
      setIsDrawing(false)
      return
    }

    const checkDrawingState = () => {
      const currentlyDrawing = terraDrawControlRef.current?.isDrawing() ?? false
      setIsDrawing(currentlyDrawing)
    }

    // Check immediately
    checkDrawingState()

    // Check periodically to keep in sync with TerraDraw's state
    const interval = setInterval(checkDrawingState, 100)

    return () => clearInterval(interval)
  }, [terraDrawControlRef, drawMode])

  // Calculate AOI centroid position on screen
  useEffect(() => {
    if (!mapInstance || !aoi) {
      setAoiCenterPosition(null)
      return
    }

    const updatePosition = () => {
      try {
        // Calculate centroid using Turf
        const centroidResult = centroid(aoi)
        const [lng, lat] = centroidResult.geometry.coordinates

        // Convert geographic coordinates to pixel coordinates relative to map container
        const point = mapInstance.project([lng, lat])

        // Get map container's position on the page
        const container = mapInstance.getContainer()
        const containerRect = container.getBoundingClientRect()

        // Convert to absolute screen coordinates
        setAoiCenterPosition({
          x: containerRect.left + point.x,
          y: containerRect.top + point.y,
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error calculating AOI center position:', error)
        setAoiCenterPosition(null)
      }
    }

    // Initial calculation
    updatePosition()

    // Update position when map moves or zooms
    mapInstance.on('move', updatePosition)
    mapInstance.on('zoom', updatePosition)
    mapInstance.on('resize', updatePosition)

    return () => {
      mapInstance.off('move', updatePosition)
      mapInstance.off('zoom', updatePosition)
      mapInstance.off('resize', updatePosition)
    }
  }, [mapInstance, aoi])

  // Force position recalculation when area changes during drawing/editing
  // This ensures tooltip position updates in real-time as geometry changes
  useEffect(() => {
    if (!mapInstance || !aoi) return

    // Trigger position update by recalculating
    const updatePosition = () => {
      try {
        const centroidResult = centroid(aoi)
        const [lng, lat] = centroidResult.geometry.coordinates
        const point = mapInstance.project([lng, lat])
        const container = mapInstance.getContainer()
        const containerRect = container.getBoundingClientRect()
        setAoiCenterPosition({
          x: containerRect.left + point.x,
          y: containerRect.top + point.y,
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error updating AOI center position:', error)
      }
    }

    // Use requestAnimationFrame to batch updates and avoid excessive recalculations
    const rafId = requestAnimationFrame(updatePosition)
    return () => cancelAnimationFrame(rafId)
  }, [mapInstance, aoi, realTimeArea, aoiArea])

  const handleMapBoundsChange = () => {
    if (mapRef.current) {
      const center = mapRef.current.getMap().getCenter()
      const updatedState = {
        latitude: center.lat,
        longitude: center.lng,
        zoom: mapRef.current.getMap().getZoom(),
      }

      localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(updatedState))
      setViewState(updatedState)
    }
    dataFinderStore.send({ type: 'mapBoundsChange' })
  }

  const handleDelete = () => {
    if (terraDrawControlRef.current) {
      terraDrawControlRef.current.delete()
    }
  }

  const handleDrawingComplete = () => {
    setDrawMode(null) // Switch back to select mode
  }

  // Determine which area to display (real-time during drawing/editing, or stored area)
  const displayArea = isDrawing ? realTimeArea : aoiArea
  // Show tooltip only during active drawing, hide after drawing finishes
  const showTooltip = Boolean(displayArea !== null && aoi !== null && isDrawing)
  // Always use AOI center position for tooltip (never follow cursor)
  const tooltipPosition = aoiCenterPosition

  const transformRequest = useCallback(
    (url: string, resourceType?: string): { url: string; headers?: Record<string, string> } => {
      if (resourceType === 'Tile') {
        const needsAuth = isAuthenticated(url)
        if (needsAuth) {
          // Determine which token type to use for this URL
          const tokenType = getTokenType(url)
          // Use workspace token for user collections, keycloak token for others
          const currentToken =
            tokenType === 'workspace' ? workspaceTokenRef.current : tokenRef.current

          if (currentToken) {
            return {
              url,
              headers: {
                Authorization: `Bearer ${currentToken}`,
              },
            }
          }
        }
      }
      return { url }
    },
    [isAuthenticated, getTokenType],
  )

  return (
    <>
      <Maplibre
        initialViewState={viewState}
        mapStyle={MAP_STYLE}
        ref={mapRef}
        cursor={drawMode !== null ? 'crosshair' : 'grab'}
        onMoveEnd={handleMapBoundsChange}
        transformRequest={transformRequest}
        onLoad={() => {
          const mapInstance = mapRef.current?.getMap()

          if (!mapInstance) return

          // Send the map instance to the store
          dataFinderStore.send({ type: 'mapLoad', mapInstance })

          // Update bounds on load
          handleMapBoundsChange()
        }}
      >
        <TerraDrawControl
          ref={terraDrawControlRef}
          mapInstance={mapInstance ?? null}
          mode={drawMode}
          onAreaChange={setRealTimeArea}
          onDrawingComplete={handleDrawingComplete}
        />
        <PinnedItemsLayer />
        <QueryItemsLayer queryItems={pageItems} />
        <HoveredItemLayer />
      </Maplibre>
      <DrawingToolbar
        onModeChange={setDrawMode}
        currentMode={drawMode}
        onDelete={handleDelete}
        hasAoi={!!aoi}
        aoi={aoi ?? null}
        mapRef={mapRef}
      />
      <AreaTooltip
        area={displayArea}
        position={tooltipPosition}
        visible={showTooltip}
        isDrawing={isDrawing}
      />
      <RestoreAOIDialog />
    </>
  )
}
