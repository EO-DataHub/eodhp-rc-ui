import { useEffect, useRef } from 'react'
import { TerraDraw } from 'terra-draw'
import maplibregl from 'maplibre-gl'
import { booleanPointInPolygon } from '@turf/turf'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

interface UseTerraDrawClickDeselectOptions {
  terraDrawRef: React.RefObject<TerraDraw | null>
  mapInstance: maplibregl.Map | null
  isReady: boolean
  isUpdatingFromTerraDrawRef: React.MutableRefObject<boolean>
}

/**
 * Hook to handle click/double-click events to deselect AOI when clicking inside it
 * This allows users to turn off edit mode by clicking inside the AOI
 * @param options - Configuration options
 */
export function useTerraDrawClickDeselect({
  terraDrawRef,
  mapInstance,
  isReady,
  isUpdatingFromTerraDrawRef,
}: UseTerraDrawClickDeselectOptions) {
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)
  const isDeselectingRef = useRef(false)
  const lastClickTimeRef = useRef<number>(0)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isReady || !mapInstance || !terraDrawRef.current || !aoi) {
      return
    }

    const terraDraw = terraDrawRef.current

    const deselectFeature = () => {
      if (isDeselectingRef.current || isUpdatingFromTerraDrawRef.current) {
        return
      }

      try {
        isDeselectingRef.current = true

        // Get the AOI feature from TerraDraw
        const allFeatures = terraDraw.getSnapshot()
        const aoiFeature = allFeatures.find((f) => f.id === aoi.id)

        if (!aoiFeature) {
          isDeselectingRef.current = false
          return
        }

        // Deselect by removing and re-adding the feature
        // This causes TerraDraw to deselect it
        const featureId = aoiFeature.id
        if (!featureId) {
          isDeselectingRef.current = false
          return
        }

        // Mark that we're updating to prevent sync loops
        // Set this BEFORE any TerraDraw operations to prevent change events from updating the store
        isUpdatingFromTerraDrawRef.current = true

        // Store the feature data before removal (deep clone to ensure we have the exact same data)
        const featureData = JSON.parse(JSON.stringify(aoiFeature))
        const originalGeometry = JSON.stringify(featureData.geometry)

        // Remove the feature
        terraDraw.removeFeatures([featureId])

        // Re-add it immediately (this should deselect it)
        // Use requestAnimationFrame to ensure smooth re-addition
        requestAnimationFrame(() => {
          try {
            terraDraw.addFeatures([featureData as Parameters<typeof terraDraw.addFeatures>[0][0]])

            // Keep the flag set longer to ensure all change events (delete + create) are processed
            // TerraDraw fires change events asynchronously, so we need to wait longer
            // We need to wait for both the delete event AND the create event to complete
            setTimeout(() => {
              // Double-check that geometry hasn't changed before resetting flag
              const currentAoi = dataFinderStore.getSnapshot().context.aoi
              const currentGeometry = currentAoi ? JSON.stringify(currentAoi.geometry) : null

              if (currentGeometry === originalGeometry) {
                isUpdatingFromTerraDrawRef.current = false
                isDeselectingRef.current = false
              } else {
                // Geometry changed, keep flag set a bit longer
                setTimeout(() => {
                  isUpdatingFromTerraDrawRef.current = false
                  isDeselectingRef.current = false
                }, 200)
              }
            }, 400) // Increased to 400ms to ensure both delete and create events are processed
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Error re-adding feature after deselection:', error)
            isUpdatingFromTerraDrawRef.current = false
            isDeselectingRef.current = false
          }
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Error deselecting AOI:', error)
        isUpdatingFromTerraDrawRef.current = false
        isDeselectingRef.current = false
      }
    }

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      // Check if this might be part of a double-click
      // If a double-click happens, handleDoubleClick will cancel this timeout
      const now = Date.now()
      const timeSinceLastClick = now - lastClickTimeRef.current

      // Clear any pending single-click timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }

      // If this might be a double-click (within 300ms), wait before processing
      if (timeSinceLastClick < 300) {
        lastClickTimeRef.current = now
        return // Let handleDoubleClick handle it
      }

      lastClickTimeRef.current = now

      // Only handle clicks when in select mode (edit mode)
      // TerraDraw uses 'select' when no feature is selected, and 'selecting' when a feature is selected
      const modeState = terraDraw.getModeState()
      const modeStateString = String(modeState)

      // Allow both 'select' and 'selecting' modes - 'selecting' means a feature is selected (edit mode)
      if (modeStateString !== 'select' && modeStateString !== 'selecting') {
        return
      }

      // Don't interfere if we're already deselecting or updating
      if (isDeselectingRef.current || isUpdatingFromTerraDrawRef.current) {
        return
      }

      // Check if there are any features
      const allFeatures = terraDraw.getSnapshot()
      if (allFeatures.length === 0) {
        return
      }

      // Don't interfere if user is actively dragging (check if mouse button is down)
      // TerraDraw handles dragging internally, so we shouldn't deselect during drag
      if (event.originalEvent?.buttons !== undefined && event.originalEvent.buttons !== 0) {
        return
      }

      // Get click coordinates
      const [lng, lat] = event.lngLat.toArray()
      const clickPoint = {
        type: 'Point' as const,
        coordinates: [lng, lat],
      }

      // Check if click is inside the AOI
      // Type assertion needed because booleanPointInPolygon expects Polygon/MultiPolygon but aoi.geometry is Geometry
      const isInsideAoi = booleanPointInPolygon(
        clickPoint,
        aoi.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      )

      if (isInsideAoi) {
        // Delay single-click handling to allow double-click to be detected first
        clickTimeoutRef.current = setTimeout(() => {
          // Check if a double-click happened in the meantime
          const timeSinceClick = Date.now() - lastClickTimeRef.current
          if (timeSinceClick < 300) {
            return
          }

          const currentModeState = terraDraw.getModeState()
          const currentModeStateString = String(currentModeState)

          // Check again if we're still in select/selecting mode and not updating
          if (
            (currentModeStateString === 'select' || currentModeStateString === 'selecting') &&
            !isDeselectingRef.current &&
            !isUpdatingFromTerraDrawRef.current
          ) {
            // Deselect the feature
            deselectFeature()
          }
        }, 300) // Wait 300ms to see if a double-click comes
      }
    }

    const handleDoubleClick = (event: maplibregl.MapMouseEvent) => {
      // Cancel any pending single-click handler
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }

      // Update last click time to prevent single-click from firing
      lastClickTimeRef.current = Date.now()

      // Only handle double-clicks when in select mode (edit mode)
      // TerraDraw uses 'select' when no feature is selected, and 'selecting' when a feature is selected
      const modeState = terraDraw.getModeState()
      const modeStateString = String(modeState)

      // Allow both 'select' and 'selecting' modes - 'selecting' means a feature is selected (edit mode)
      if (modeStateString !== 'select' && modeStateString !== 'selecting') {
        return
      }

      // Don't interfere if we're already deselecting or updating
      if (isDeselectingRef.current || isUpdatingFromTerraDrawRef.current) {
        return
      }

      // Don't interfere if user is actively dragging
      if (event.originalEvent?.buttons !== undefined && event.originalEvent.buttons !== 0) {
        return
      }

      // Get click coordinates
      const [lng, lat] = event.lngLat.toArray()
      const clickPoint = {
        type: 'Point' as const,
        coordinates: [lng, lat],
      }

      // Check if double-click is inside the AOI
      // Type assertion needed because booleanPointInPolygon expects Polygon/MultiPolygon but aoi.geometry is Geometry
      const isInsideAoi = booleanPointInPolygon(
        clickPoint,
        aoi.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      )

      if (isInsideAoi) {
        // Deselect immediately for double-click (no delay needed since we cancelled single-click)
        deselectFeature()
      }
    }

    // Add event listeners
    mapInstance.on('click', handleClick)
    mapInstance.on('dblclick', handleDoubleClick)

    return () => {
      // Remove event listeners
      mapInstance.off('click', handleClick)
      mapInstance.off('dblclick', handleDoubleClick)
      // Clear any pending timeouts
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
    }
  }, [isReady, mapInstance, terraDrawRef, aoi, isUpdatingFromTerraDrawRef])
}
