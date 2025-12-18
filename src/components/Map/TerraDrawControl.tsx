import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useSelector } from '@xstate/store/react'
import {
  TerraDraw,
  TerraDrawRectangleMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import maplibregl from 'maplibre-gl'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { calculateAoiArea } from '@/library/geoUtils'

interface TerraDrawControlProps {
  mapInstance: maplibregl.Map | null
  mode?: 'rectangle' | 'polygon' | null
  onAreaChange?: (area: number | null) => void
  onCursorPositionChange?: (position: { x: number; y: number } | null) => void
  onDrawingStateChange?: (isDrawing: boolean) => void
}

export interface TerraDrawControlRef {
  delete: () => void
  add: (feature: GeoJSON.Feature) => void
}

export const TerraDrawControl = forwardRef<TerraDrawControlRef, TerraDrawControlProps>(
  ({ mapInstance, mode, onAreaChange, onCursorPositionChange, onDrawingStateChange }, ref) => {
    const terraDrawRef = useRef<TerraDraw | null>(null)
    const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)
    const lastAoiRef = useRef<GeoJSON.Feature | undefined>(undefined)
    const isUpdatingFromTerraDrawRef = useRef(false)
    const mouseMoveCleanupRef = useRef<(() => void) | null>(null)
    const styleDataCleanupRef = useRef<(() => void) | null>(null)

    useImperativeHandle(ref, () => ({
      delete: () => {
        if (!terraDrawRef.current) return

        // Check if it's safe to clear before proceeding
        const checkAndClear = () => {
          try {
            const terraDraw = terraDrawRef.current
            if (!terraDraw) return

            // Check if TerraDraw is in a safe state for clearing
            const modeState = terraDraw.getModeState()
            // It's safer to clear when not actively drawing
            // But we can still clear in other states if needed
            if (modeState === 'drawing') {
              // If actively drawing, wait a bit and try again
              void setTimeout(checkAndClear, 50)
              return
            }

            // Verify there are actually features to clear
            const existingIds = terraDraw
              .getSnapshot()
              .map((f) => f.id)
              .filter((id) => id !== undefined)
            if (existingIds.length > 0) {
              terraDraw.clear()
            }
          } catch (error) {
            // Log error instead of suppressing
            // eslint-disable-next-line no-console
            console.warn('Error clearing TerraDraw features:', error)
          }
        }

        // Use setTimeout to ensure any ongoing TerraDraw operations complete first
        void setTimeout(checkAndClear, 0)
      },
      add: (feature: GeoJSON.Feature) => {
        if (
          !terraDrawRef.current ||
          !(feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
        ) {
          return
        }

        isUpdatingFromTerraDrawRef.current = true
        // Use setTimeout to ensure any ongoing TerraDraw operations complete first
        void setTimeout(() => {
          try {
            const terraDraw = terraDrawRef.current
            if (!terraDraw) {
              isUpdatingFromTerraDrawRef.current = false
              return
            }

            // Check if there are features to clear before clearing
            const existingIds = terraDraw
              .getSnapshot()
              .map((f) => f.id)
              .filter((id) => id !== undefined)
            if (existingIds.length > 0) {
              terraDraw.clear()
            }

            terraDraw.addFeatures([feature as Parameters<typeof terraDraw.addFeatures>[0][0]])
            lastAoiRef.current = feature
          } catch (error) {
            // Log error instead of suppressing
            // eslint-disable-next-line no-console
            console.warn('Error adding feature to TerraDraw:', error)
          }
          // Reset flag after a brief delay to allow events to process
          void setTimeout(() => {
            isUpdatingFromTerraDrawRef.current = false
          }, 100)
        }, 0)
      },
    }))

    // Sync store aoi with TerraDraw when it changes (but not from TerraDraw events)
    useEffect(() => {
      if (!terraDrawRef.current || isUpdatingFromTerraDrawRef.current) return

      // Compare by geometry string to avoid reference equality issues
      const currentAoiGeometry = aoi?.geometry ? JSON.stringify(aoi.geometry) : null
      const lastAoiGeometry = lastAoiRef.current?.geometry
        ? JSON.stringify(lastAoiRef.current.geometry)
        : null

      // If aoi was added/updated via storeAoi (and geometry actually changed)
      if (
        aoi &&
        currentAoiGeometry !== lastAoiGeometry &&
        (aoi.geometry.type === 'Polygon' || aoi.geometry.type === 'MultiPolygon')
      ) {
        isUpdatingFromTerraDrawRef.current = true
        // Use setTimeout to ensure any ongoing TerraDraw operations complete first
        void setTimeout(() => {
          try {
            const terraDraw = terraDrawRef.current
            if (!terraDraw) {
              isUpdatingFromTerraDrawRef.current = false
              return
            }

            // Check if there are features to clear before clearing
            const existingIds = terraDraw
              .getSnapshot()
              .map((f) => f.id)
              .filter((id) => id !== undefined)
            if (existingIds.length > 0) {
              terraDraw.clear()
            }

            terraDraw.addFeatures([aoi as Parameters<typeof terraDraw.addFeatures>[0][0]])
            lastAoiRef.current = aoi
          } catch (error) {
            // Log error instead of suppressing
            // eslint-disable-next-line no-console
            console.warn('Error syncing AOI to TerraDraw:', error)
          }
          void setTimeout(() => {
            isUpdatingFromTerraDrawRef.current = false
          }, 100)
        }, 0)
      }
      // If aoi was removed
      else if (!aoi && lastAoiRef.current) {
        isUpdatingFromTerraDrawRef.current = true
        // Use setTimeout to ensure any ongoing TerraDraw operations complete first
        void setTimeout(() => {
          try {
            const terraDraw = terraDrawRef.current
            if (!terraDraw) {
              isUpdatingFromTerraDrawRef.current = false
              return
            }

            // Check if there are features to clear before clearing
            const existingIds = terraDraw
              .getSnapshot()
              .map((f) => f.id)
              .filter((id) => id !== undefined)
            if (existingIds.length > 0) {
              terraDraw.clear()
            }
            lastAoiRef.current = undefined
          } catch (error) {
            // Log error instead of suppressing
            // eslint-disable-next-line no-console
            console.warn('Error clearing AOI from TerraDraw:', error)
          }
          void setTimeout(() => {
            isUpdatingFromTerraDrawRef.current = false
          }, 100)
        }, 0)
      }
    }, [aoi])

    // Helper to move TerraDraw layers to the top of the layer stack
    const moveTerraDrawLayersToTop = (map: maplibregl.Map) => {
      try {
        const style = map.getStyle()
        if (!style?.layers) return

        // TerraDraw layers typically have IDs starting with "terra-draw-"
        // or contain "terra-draw" in their ID, or start with "td-"
        const terraDrawLayerIds: string[] = []

        // Collect all layer IDs and identify TerraDraw layers
        for (const layer of style.layers) {
          if (layer.id.includes('terra-draw') || layer.id.startsWith('td-')) {
            terraDrawLayerIds.push(layer.id)
          }
        }

        // Move each TerraDraw layer to the top
        // We move them in reverse order to maintain their relative order
        for (let i = terraDrawLayerIds.length - 1; i >= 0; i--) {
          const layerId = terraDrawLayerIds[i]
          try {
            // Move to the top (before undefined means move to top)
            map.moveLayer(layerId)
          } catch (error) {
            // Layer might not exist yet or already be at top
            // eslint-disable-next-line no-console
            console.debug('Could not move TerraDraw layer:', layerId, error)
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Error moving TerraDraw layers to top:', error)
      }
    }

    useEffect(() => {
      if (!mapInstance) return

      // Wait for map style to load
      const initializeTerraDraw = () => {
        const adapter = new TerraDrawMapLibreGLAdapter({
          map: mapInstance,
        })

        const terraDraw = new TerraDraw({
          adapter,
          modes: [
            new TerraDrawSelectMode({
              flags: {
                rectangle: {
                  feature: {
                    draggable: true,
                    rotateable: false,
                    scaleable: false,
                    coordinates: {
                      draggable: true,
                      midpoints: true,
                      deletable: true,
                    },
                  },
                },
                polygon: {
                  feature: {
                    draggable: true,
                    rotateable: false,
                    scaleable: false,
                    coordinates: {
                      draggable: true,
                      midpoints: true,
                      deletable: true,
                    },
                  },
                },
              },
              styles: {
                selectedPolygonColor: '#000000', // Dark color for tint
                selectedPolygonFillOpacity: 0.15, // Slight dark tint
                selectedPolygonOutlineColor: '#D73027',
                selectedPolygonOutlineWidth: 2,
                selectionPointColor: '#D73027',
                selectionPointOutlineColor: '#FFFFFF',
                selectionPointWidth: 6,
                selectionPointOutlineWidth: 2,
                midPointColor: '#D73027',
                midPointOutlineColor: '#FFFFFF',
                midPointWidth: 5,
                midPointOutlineWidth: 2,
              },
            }),
            new TerraDrawRectangleMode({
              styles: {
                fillColor: '#000000', // Dark color for tint
                outlineColor: '#D73027',
                outlineWidth: 2,
                fillOpacity: 0.15, // Slight dark tint
              },
            }),
            new TerraDrawPolygonMode({
              styles: {
                fillColor: '#000000', // Dark color for tint
                outlineColor: '#D73027',
                outlineWidth: 2,
                fillOpacity: 0.15, // Slight dark tint
              },
            }),
          ],
        })

        // Helper to calculate and notify area for a feature
        const notifyArea = (feature: GeoJSON.Feature | undefined) => {
          if (feature && onAreaChange) {
            const area = calculateAoiArea(feature)
            onAreaChange(area)
          } else if (onAreaChange) {
            onAreaChange(null)
          }
        }

        // Helper to verify if a feature exists in TerraDraw's snapshot
        const verifyFeatureExists = (id: string | number): boolean => {
          try {
            const snapshot = terraDraw.getSnapshot()
            return snapshot.some((f) => f.id === id)
          } catch {
            return false
          }
        }

        // Helper to get only feature IDs that actually exist in the snapshot
        const getExistingFeatureIds = (): (string | number)[] => {
          try {
            const snapshot = terraDraw.getSnapshot()
            return snapshot.map((f) => f.id).filter((id): id is string | number => id !== undefined)
          } catch {
            return []
          }
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
                notifyArea(currentFeature as GeoJSON.Feature)
              }
            }
          }
        }

        // Map TerraDraw events to store actions
        terraDraw.on('finish', (id) => {
          try {
            // Verify the finished feature exists before processing
            if (!verifyFeatureExists(id)) {
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
                  const existingIds = getExistingFeatureIds()
                  // Filter out the current feature ID to get only "other" features
                  const otherIds = existingIds.filter((existingId) => existingId !== id)

                  // Only remove features that actually exist
                  if (otherIds.length > 0) {
                    // Verify each ID still exists before removal (defensive check)
                    const idsToRemove = otherIds.filter((otherId) => verifyFeatureExists(otherId))
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
              notifyArea(feature as GeoJSON.Feature)

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
              notifyArea(feature as GeoJSON.Feature)

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
        })

        terraDraw.on('change', (ids, changeType) => {
          try {
            // Ensure TerraDraw layers are always on top after any change
            // Use setTimeout to ensure layers are created before moving
            void setTimeout(() => {
              moveTerraDrawLayersToTop(mapInstance)
            }, 0)

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
              notifyArea(undefined)
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
                    // Clear existing features before creating new one
                    const existingIds = getExistingFeatureIds()
                    if (existingIds.length > 0) {
                      // Verify each ID still exists before removal
                      const idsToRemove = existingIds.filter((existingId) =>
                        verifyFeatureExists(existingId),
                      )
                      if (idsToRemove.length > 0) {
                        terraDraw.removeFeatures(idsToRemove)
                        // Also clear from store
                        isUpdatingFromTerraDrawRef.current = true
                        lastAoiRef.current = undefined
                        notifyArea(undefined)
                        dataFinderStore.send({ type: 'drawDelete' })
                        void setTimeout(() => {
                          isUpdatingFromTerraDrawRef.current = false
                        }, 50)
                      }
                    }
                  }
                }

                // Verify feature IDs exist before trying to access them
                const validIds = ids.filter((id) => verifyFeatureExists(id))

                if (validIds.length === 0) {
                  // No valid features to process
                  return
                }

                const features = validIds
                  .map((id) => {
                    try {
                      // Double-check feature exists before getting it
                      if (!verifyFeatureExists(id)) {
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
                  notifyArea(features[0])
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
        })

        terraDraw.start()
        // Start in select mode by default to allow selection and editing
        terraDraw.setMode('select')
        // Clear cursor position when initializing (tooltip should be at AOI center if one exists)
        if (onCursorPositionChange) {
          onCursorPositionChange(null)
        }
        terraDrawRef.current = terraDraw

        // Move TerraDraw layers to the top after initialization
        // Use setTimeout to ensure layers are created
        void setTimeout(() => {
          moveTerraDrawLayersToTop(mapInstance)
        }, 100)

        // Restore AOI from localStorage if not already in store
        // (storeAoi might have already been called by RestoreAOIDialog)
        const currentAoi = dataFinderStore.getSnapshot().context.aoi
        if (!currentAoi) {
          const storedAoi = localStorage.getItem('aoiData')
          if (storedAoi) {
            try {
              const parsedAoi = JSON.parse(storedAoi) as GeoJSON.Feature
              if (
                parsedAoi.geometry.type === 'Polygon' ||
                parsedAoi.geometry.type === 'MultiPolygon'
              ) {
                terraDraw.addFeatures([parsedAoi as Parameters<typeof terraDraw.addFeatures>[0][0]])
                lastAoiRef.current = parsedAoi
                // Notify area for restored AOI
                notifyArea(parsedAoi)
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('Failed to restore AOI from localStorage:', error)
            }
          }
        } else {
          // AOI already in store, add it to TerraDraw
          if (
            currentAoi.geometry.type === 'Polygon' ||
            currentAoi.geometry.type === 'MultiPolygon'
          ) {
            terraDraw.addFeatures([currentAoi as Parameters<typeof terraDraw.addFeatures>[0][0]])
            lastAoiRef.current = currentAoi
            // Notify area for AOI from store
            notifyArea(currentAoi)
          }
        }

        // single rAF-throttled mousemove listener
        // - computes area only when actively drawing
        // - sends cursor position while drawing so the tooltip follows the cursor
        // - resets cursor position when not drawing so the tooltip returns to AOI centroid
        const container = mapInstance.getContainer()
        if (container) {
          let rafId: number | null = null

          const onMouseMove = (e: MouseEvent) => {
            if (rafId) return // avoid multiple calls per frame
            rafId = requestAnimationFrame(() => {
              rafId = null

              const td = terraDrawRef.current
              if (!td) return

              const modeState = td.getModeState()

              if (modeState === 'drawing') {
                onCursorPositionChange?.({ x: e.clientX, y: e.clientY })

                const features = td.getSnapshot()
                const current = features[features.length - 1]
                if (current?.geometry) {
                  onAreaChange?.(calculateAoiArea(current as GeoJSON.Feature))
                }
              } else {
                // when not drawing, tooltip should snap back to AOI centroid
                onCursorPositionChange?.(null)
              }
            })
          }

          container.addEventListener('mousemove', onMouseMove)

          // Keep cleanup closure so we can remove exactly this listener on unmount
          mouseMoveCleanupRef.current = () => {
            container.removeEventListener('mousemove', onMouseMove)
          }
        }

        // Listen for style changes to ensure TerraDraw layers stay on top
        // This handles cases where item layers are added dynamically
        let styleDataTimeout: ReturnType<typeof setTimeout> | null = null
        const onStyleData = () => {
          // Debounce to avoid excessive calls
          if (styleDataTimeout) {
            clearTimeout(styleDataTimeout)
          }
          styleDataTimeout = setTimeout(() => {
            moveTerraDrawLayersToTop(mapInstance)
          }, 100)
        }

        mapInstance.on('styledata', onStyleData)

        // Store cleanup function for style data listener
        styleDataCleanupRef.current = () => {
          if (styleDataTimeout) {
            clearTimeout(styleDataTimeout)
          }
          mapInstance.off('styledata', onStyleData)
        }
      }

      if (mapInstance.isStyleLoaded()) {
        initializeTerraDraw()
      } else {
        void mapInstance.once('style.load', initializeTerraDraw)
      }

      return () => {
        // Remove mouse move listener if registered
        if (mouseMoveCleanupRef.current) {
          mouseMoveCleanupRef.current()
          mouseMoveCleanupRef.current = null
        }
        // Clean up style data listener
        if (styleDataCleanupRef.current) {
          styleDataCleanupRef.current()
          styleDataCleanupRef.current = null
        }
        // Reset callbacks
        if (onCursorPositionChange) {
          onCursorPositionChange(null)
        }
        if (onAreaChange) {
          onAreaChange(null)
        }
        if (onDrawingStateChange) {
          onDrawingStateChange(false)
        }
        // Clean up TerraDraw
        if (terraDrawRef.current && mapInstance) {
          try {
            // Check if map is still valid by checking if it has a style
            if (mapInstance.getStyle()) {
              terraDrawRef.current.stop()
            }
          } catch (error) {
            // Ignore errors during cleanup - map might already be destroyed
            // eslint-disable-next-line no-console
            console.warn('Error stopping TerraDraw during cleanup:', error)
          }
          terraDrawRef.current = null
        }
      }
    }, [mapInstance, onAreaChange, onCursorPositionChange, onDrawingStateChange])

    // Handle mode changes
    useEffect(() => {
      if (!terraDrawRef.current) return

      try {
        const terraDraw = terraDrawRef.current
        const currentModeState = terraDraw.getModeState()

        // If switching to select mode, ensure we're not in an unsafe state
        // TerraDraw might be trying to clean up selections during mode change
        if (mode === null && currentModeState === 'drawing') {
          // Wait a bit if actively drawing before switching to select
          void setTimeout(() => {
            try {
              terraDraw.setMode('select')
              onDrawingStateChange?.(false)
              if (onCursorPositionChange) {
                onCursorPositionChange(null)
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.warn('Error switching to select mode:', error)
            }
          }, 50)
          return
        }

        if (mode === 'rectangle') {
          terraDraw.setMode('rectangle')
          onDrawingStateChange?.(true)
          // Ensure TerraDraw layers are on top when switching to drawing mode
          if (mapInstance) {
            void setTimeout(() => {
              moveTerraDrawLayersToTop(mapInstance)
            }, 50)
          }
        } else if (mode === 'polygon') {
          terraDraw.setMode('polygon')
          onDrawingStateChange?.(true)
          // Ensure TerraDraw layers are on top when switching to drawing mode
          if (mapInstance) {
            void setTimeout(() => {
              moveTerraDrawLayersToTop(mapInstance)
            }, 50)
          }
        } else {
          // Return to select mode when mode is null (default mode for selection/editing)
          terraDraw.setMode('select')
          onDrawingStateChange?.(false)
          // Clear cursor position when entering select mode (tooltip should be at AOI center)
          if (onCursorPositionChange) {
            onCursorPositionChange(null)
          }
        }
      } catch (error) {
        // Log error with context instead of suppressing
        // eslint-disable-next-line no-console
        console.warn('Error changing TerraDraw mode:', error, { requestedMode: mode })
      }
    }, [mode, mapInstance, onDrawingStateChange, onCursorPositionChange])

    return null
  },
)

TerraDrawControl.displayName = 'TerraDrawControl'
