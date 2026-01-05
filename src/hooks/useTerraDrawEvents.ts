import { useEffect } from 'react'
import { TerraDraw } from 'terra-draw'
import maplibregl from 'maplibre-gl'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { moveTerraDrawLayersToTop } from '@/lib/terradraw/helpers/layerManagement'
import { verifyFeatureExists, getExistingFeatureIds } from '@/lib/terradraw/helpers/featureUtils'
import { notifyAreaChange } from '@/lib/terradraw/helpers/areaUtils'

interface UseTerraDrawEventsOptions {
  terraDrawRef: React.RefObject<TerraDraw | null>
  modeRef: React.MutableRefObject<'rectangle' | 'polygon' | null>
  onDrawingCompleteRef: React.MutableRefObject<(() => void) | undefined>
  isUpdatingFromTerraDrawRef: React.MutableRefObject<boolean>
  lastAoiRef: React.MutableRefObject<GeoJSON.Feature | undefined>
  mapInstance: maplibregl.Map | null
  isReady: boolean
  onAreaChange?: (area: number | null) => void
  onDrawingStateChange?: (isDrawing: boolean) => void
  onCursorPositionChange?: (position: { x: number; y: number } | null) => void
}

/**
 * Hook to handle TerraDraw event listeners (finish, change)
 * @param options - Configuration options
 */
export function useTerraDrawEvents({
  terraDrawRef,
  modeRef,
  onDrawingCompleteRef,
  isUpdatingFromTerraDrawRef,
  lastAoiRef,
  mapInstance,
  isReady,
  onAreaChange,
  onDrawingStateChange,
  onCursorPositionChange,
}: UseTerraDrawEventsOptions) {
  useEffect(() => {
    if (!isReady) return
    const terraDraw = terraDrawRef.current
    if (!terraDraw) return

    // Helper to verify if a feature exists in TerraDraw's snapshot
    const verifyFeatureExistsLocal = (id: string | number): boolean => {
      return verifyFeatureExists(terraDraw, id)
    }

    // Helper to get only feature IDs that actually exist in the snapshot
    const getExistingFeatureIdsLocal = (): (string | number)[] => {
      return getExistingFeatureIds(terraDraw)
    }

    // Track drawing state and update area during drawing
    const updateDrawingState = (isDrawing: boolean) => {
      if (onDrawingStateChange) {
        onDrawingStateChange(isDrawing)
      }
      // When drawing starts, calculate area from current feature
      if (isDrawing) {
        const modeState = terraDraw.getModeState()
        if (modeState === 'drawing') {
          // Get all features (including provisional ones)
          const allFeatures = terraDraw.getSnapshot()
          if (allFeatures.length > 0) {
            const currentFeature = allFeatures[allFeatures.length - 1]
            notifyAreaChange(currentFeature as GeoJSON.Feature, onAreaChange)
          }
        }
      }
    }

    // Map TerraDraw events to store actions
    const handleFinish = (id: string | number) => {
      try {
        // Verify the finished feature exists before processing
        if (!verifyFeatureExistsLocal(id)) {
          // eslint-disable-next-line no-console
          console.warn('Finish event received for non-existent feature:', id)
          return
        }

        const feature = terraDraw.getSnapshotFeature(id)
        if (feature?.geometry) {
          // Clear any existing features before processing the new one
          // This ensures only one AOI exists at a time
          // Get current snapshot to verify what features actually exist
          void setTimeout(() => {
            try {
              // Get all existing feature IDs from snapshot
              const existingIds = getExistingFeatureIdsLocal()
              // Filter out the current feature ID to get only "other" features
              const otherIds = existingIds.filter((existingId) => existingId !== id)

              // Only remove features that actually exist
              if (otherIds.length > 0) {
                // Verify each ID still exists before removal (defensive check)
                const idsToRemove = otherIds.filter((otherId) => verifyFeatureExistsLocal(otherId))
                if (idsToRemove.length > 0) {
                  terraDraw.removeFeatures(idsToRemove)
                }
              }
            } catch (error) {
              // Log error but don't suppress - this helps identify issues
              // eslint-disable-next-line no-console
              console.warn('Error removing other features after finish:', error)
            }
          }, 0)

          // Mark that we're updating from TerraDraw to prevent sync loop
          isUpdatingFromTerraDrawRef.current = true
          lastAoiRef.current = feature as GeoJSON.Feature

          // Notify area change
          notifyAreaChange(feature as GeoJSON.Feature, onAreaChange)

          // Create a compatible event structure for the store
          dataFinderStore.send({
            type: 'drawCreateOrUpdate',
            mapEvent: { features: [feature as GeoJSON.Feature] } as {
              features: GeoJSON.Feature[]
            },
          })

          // Update drawing state - finished drawing (switches to select mode)
          updateDrawingState(false)
          // Clear cursor position when finished drawing (tooltip should be at AOI center)
          if (onCursorPositionChange) {
            onCursorPositionChange(null)
          }
          // Ensure area is updated after finishing
          notifyAreaChange(feature as GeoJSON.Feature, onAreaChange)

          // Notify parent to switch back to select mode if we were in a drawing mode
          const currentMode = modeRef.current
          if (currentMode === 'rectangle' || currentMode === 'polygon') {
            onDrawingCompleteRef.current?.()
          }

          // Reset flag after store update
          void setTimeout(() => {
            isUpdatingFromTerraDrawRef.current = false
          }, 100)
        } else {
          // eslint-disable-next-line no-console
          console.warn('Finish event: feature has no valid geometry', id)
        }
      } catch (error) {
        // Log error with context - feature might have been deleted or state changed
        // eslint-disable-next-line no-console
        console.warn('Error handling finish event:', error, { featureId: id })
      }
    }

    const handleChange = (ids: (string | number)[], changeType: string) => {
      try {
        // Ensure TerraDraw layers are always on top after any change
        // Use setTimeout to ensure layers are created before moving
        if (mapInstance) {
          void setTimeout(() => {
            moveTerraDrawLayersToTop(mapInstance)
          }, 0)
        }

        if (changeType === 'delete' || ids.length === 0) {
          // Check if there are still features remaining in TerraDraw
          // This prevents clearing the store when old features are removed during finish
          const remainingFeatures = terraDraw.getSnapshot()
          const hasRemainingFeatures = remainingFeatures.length > 0

          // If there are still features remaining, this delete event is likely cleanup of old features
          // during a finish operation. Don't send drawDelete - the new feature is still there.
          // Only send drawDelete if there are truly no features left.
          if (hasRemainingFeatures) {
            // Features still exist - this is cleanup, not a true delete
            return
          }

          // Feature was truly deleted (no remaining features)
          isUpdatingFromTerraDrawRef.current = true
          lastAoiRef.current = undefined
          notifyAreaChange(undefined, onAreaChange)
          updateDrawingState(false)
          // Clear cursor position when feature is deleted
          if (onCursorPositionChange) {
            onCursorPositionChange(null)
          }
          dataFinderStore.send({ type: 'drawDelete' })
          void setTimeout(() => {
            isUpdatingFromTerraDrawRef.current = false
          }, 100)
        } else if (changeType === 'update' || changeType === 'create') {
          // Feature was updated (editing, moving, or created)
          // Only update if we're not already processing a finish event
          if (!isUpdatingFromTerraDrawRef.current) {
            // If this is a create event and we're in drawing mode, clear any existing AOI first
            if (changeType === 'create') {
              const modeState = terraDraw.getModeState()
              if (modeState === 'drawing') {
                // Set drawing state to true when starting a new shape
                // This ensures tooltip shows for subsequent shapes without switching tools
                updateDrawingState(true)

                // Clear existing features before creating new one
                const existingIds = getExistingFeatureIdsLocal()
                if (existingIds.length > 0) {
                  // Verify each ID still exists before removal
                  const idsToRemove = existingIds.filter((existingId) =>
                    verifyFeatureExistsLocal(existingId),
                  )
                  if (idsToRemove.length > 0) {
                    terraDraw.removeFeatures(idsToRemove)
                    // Also clear from store
                    isUpdatingFromTerraDrawRef.current = true
                    lastAoiRef.current = undefined
                    notifyAreaChange(undefined, onAreaChange)
                    dataFinderStore.send({ type: 'drawDelete' })
                    void setTimeout(() => {
                      isUpdatingFromTerraDrawRef.current = false
                    }, 50)
                  }
                }
              }
            }

            // Verify feature IDs exist before trying to access them
            const validIds = ids.filter((id) => verifyFeatureExistsLocal(id))

            if (validIds.length === 0) {
              // No valid features to process
              return
            }

            const features = validIds
              .map((id) => {
                try {
                  // Double-check feature exists before getting it
                  if (!verifyFeatureExistsLocal(id)) {
                    return undefined
                  }
                  return terraDraw.getSnapshotFeature(id)
                } catch (error) {
                  // Log error instead of silently ignoring
                  // eslint-disable-next-line no-console
                  console.warn('Error getting feature in change event:', error, {
                    featureId: id,
                  })
                  return undefined
                }
              })
              .filter((f) => f?.geometry !== undefined) as GeoJSON.Feature[]

            if (features.length > 0) {
              isUpdatingFromTerraDrawRef.current = true
              lastAoiRef.current = features[0]
              // Notify area change for real-time display
              notifyAreaChange(features[0], onAreaChange)
              // Create a compatible event structure for the store
              dataFinderStore.send({
                type: 'drawCreateOrUpdate',
                mapEvent: { features } as { features: GeoJSON.Feature[] },
              })
              void setTimeout(() => {
                isUpdatingFromTerraDrawRef.current = false
              }, 100)
            }
          }
        }
      } catch (error) {
        // Log error with context instead of suppressing
        // eslint-disable-next-line no-console
        console.warn('Error handling change event:', error, { changeType, featureIds: ids })
      }
    }

    terraDraw.on('finish', handleFinish)
    terraDraw.on('change', handleChange)

    return () => {
      terraDraw.off('finish', handleFinish)
      terraDraw.off('change', handleChange)
    }
  }, [
    isReady,
    terraDrawRef,
    modeRef,
    onDrawingCompleteRef,
    isUpdatingFromTerraDrawRef,
    lastAoiRef,
    mapInstance,
    onAreaChange,
    onDrawingStateChange,
    onCursorPositionChange,
  ])
}
