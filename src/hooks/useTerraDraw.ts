import { useCallback, useEffect, useRef } from 'react'
import { useSelector } from '@xstate/store/react'
import { MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw'
import { MapInstance } from 'react-map-gl/maplibre'
import type { LayerSpecification } from 'maplibre-gl'
import { TerraDrawFeature } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import {
  TERRA_DRAW_CONFIG,
  TerraDrawEvent,
  createAOIFeature,
  isValidPolygonFeature,
} from '@/library/terraDrawUtils'

export const useTerraDraw = (mapInstance: MapInstance | undefined) => {
  const terradrawInstance = useSelector(dataFinderStore, (state) => state.context.terradrawInstance)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  const terradrawControlAdded = useRef(false)
  const isRestoringRef = useRef(false)
  const drawControlRef = useRef<MaplibreMeasureControl | null>(null)

  const restoreAOIToTerraDraw = useCallback(
    (aoiFeature: GeoJSON.Feature) => {
      if (!terradrawInstance || !aoiFeature) return

      isRestoringRef.current = true

      try {
        const currentSnapshot = terradrawInstance.getSnapshot()

        // Clear existing features if any
        if (currentSnapshot && currentSnapshot.length > 0) {
          terradrawInstance.clear()
        }

        // Ensure TerraDraw is enabled before adding features
        if (!terradrawInstance.enabled) {
          terradrawInstance.start()
        }

        // Add the AOI feature
        terradrawInstance.addFeatures([aoiFeature])
      } catch (error) {
        // If TerraDraw isn't ready, try again after a short delay
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('not enabled') || errorMessage.includes('already exists')) {
          setTimeout(() => {
            try {
              if (terradrawInstance.enabled) {
                terradrawInstance.clear()
                terradrawInstance.addFeatures([aoiFeature])
              }
            } catch (retryError) {
              // Retry failed, ignore
            }
          }, 200)
        }
      } finally {
        isRestoringRef.current = false
      }
    },
    [terradrawInstance],
  )

  // Initialize TerraDraw on map load
  const initializeTerraDraw = useCallback(() => {
    if (!mapInstance || terradrawControlAdded.current) return

    // Check if layers and sources already exist and remove them properly
    try {
      const style = mapInstance.getStyle()
      if (style) {
        // First remove layers that use TerraDraw sources
        if (style.layers) {
          const terraDrawLayers = style.layers.filter(
            (layer: LayerSpecification) =>
              'source' in layer &&
              typeof layer.source === 'string' &&
              layer.source.startsWith('td-'),
          )
          terraDrawLayers.forEach((layer: LayerSpecification) => {
            try {
              mapInstance.removeLayer(layer.id)
            } catch (e) {
              // Layer might not exist
            }
          })
        }

        // Then remove sources
        if (style.sources) {
          const existingSources = Object.keys(style.sources)
          const terraDrawSources = existingSources.filter((source) => source.startsWith('td-'))

          terraDrawSources.forEach((source) => {
            try {
              mapInstance.removeSource(source)
            } catch (e) {
              // Source might not exist or already removed
            }
          })
        }
      }
    } catch (e) {
      // Style might not be loaded yet
    }

    // Check if control already exists
    if (drawControlRef.current) {
      try {
        mapInstance.removeControl(drawControlRef.current)
      } catch (e) {
        // Control might not exist
      }
    }

    const drawControl = new MaplibreMeasureControl(TERRA_DRAW_CONFIG)
    drawControlRef.current = drawControl

    try {
      mapInstance.addControl(drawControl, 'top-right')
    } catch (error) {
      return
    }

    const setupTerraDraw = () => {
      if (terradrawControlAdded.current) return

      const terraDrawInstance = drawControl.getTerraDrawInstance()

      if (terraDrawInstance) {
        dataFinderStore.send({
          type: 'terradrawControlLoad',
          terradrawInstance: terraDrawInstance,
        })

        try {
          // Add more defensive checks for event listener setup
          if (terraDrawInstance.on && typeof terraDrawInstance.on === 'function') {
            // Additional check to ensure TerraDraw is properly initialized
            // Try a simple operation first to verify the instance is ready
            try {
              terraDrawInstance.getSnapshot() // This should work if TerraDraw is ready
            } catch (initError) {
              return
            }

            terraDrawInstance.on('finish', (id: string) => {
              const snapshot = terraDrawInstance.getSnapshot()
              const feature = snapshot?.find((f: TerraDrawFeature) => f.id === id)

              if (feature && isValidPolygonFeature(feature)) {
                // Clear any existing features before adding the new one
                if (snapshot && snapshot.length > 1) {
                  terraDrawInstance.clear()
                  terraDrawInstance.addFeatures([feature])
                }

                const aoiFeature = createAOIFeature(feature)
                dataFinderStore.send({
                  type: 'terradrawFeatureCreate',
                  feature: aoiFeature,
                })
              }
            })

            terraDrawInstance.on('delete', () => {
              if (isRestoringRef.current) return
              dataFinderStore.send({ type: 'terradrawFeatureDelete' })
            })

            terraDrawInstance.on('modechange', (event: TerraDrawEvent) => {
              const mode = event.mode ?? String(event)
              dataFinderStore.send({
                type: 'terradrawModeChange',
                mode: mode,
              })
            })
          }
        } catch (error) {
          // If event listener setup fails, try again after a delay
          setTimeout(() => {
            if (terradrawControlAdded.current) return // Don't retry if already set up
            try {
              if (terraDrawInstance.on && typeof terraDrawInstance.on === 'function') {
                terraDrawInstance.on('finish', (id: string) => {
                  const snapshot = terraDrawInstance.getSnapshot()
                  const feature = snapshot?.find((f: TerraDrawFeature) => f.id === id)

                  if (feature && isValidPolygonFeature(feature)) {
                    if (snapshot && snapshot.length > 1) {
                      terraDrawInstance.clear()
                      terraDrawInstance.addFeatures([feature])
                    }

                    const aoiFeature = createAOIFeature(feature)
                    dataFinderStore.send({
                      type: 'terradrawFeatureCreate',
                      feature: aoiFeature,
                    })
                  }
                })

                terraDrawInstance.on('delete', () => {
                  if (isRestoringRef.current) return
                  dataFinderStore.send({ type: 'terradrawFeatureDelete' })
                })

                terraDrawInstance.on('modechange', (event: TerraDrawEvent) => {
                  const mode = event.mode ?? String(event)
                  dataFinderStore.send({
                    type: 'terradrawModeChange',
                    mode: mode,
                  })
                })
              }
            } catch (retryError) {
              // Retry failed, ignore
            }
          }, 300)
        }
      }
      terradrawControlAdded.current = true
    }

    // More robust wait for map readiness
    const waitForMapReady = () => {
      try {
        if (mapInstance.isStyleLoaded() && mapInstance.getStyle()?.sources) {
          // Add a small delay to ensure TerraDraw control is fully initialized
          setTimeout(setupTerraDraw, 50)
        } else {
          // Wait a bit and try again
          setTimeout(waitForMapReady, 150)
        }
      } catch (e) {
        // Map might not be ready, try again
        setTimeout(waitForMapReady, 150)
      }
    }

    waitForMapReady()
  }, [mapInstance])

  // Cleanup function to reset when component unmounts or map changes
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts or map changes
      if (mapInstance && drawControlRef.current) {
        try {
          // Remove TerraDraw layers and sources if they exist
          const style = mapInstance.getStyle()
          if (style) {
            // Remove layers first
            if (style.layers) {
              const terraDrawLayers = style.layers.filter(
                (layer: LayerSpecification) =>
                  'source' in layer &&
                  typeof layer.source === 'string' &&
                  layer.source.startsWith('td-'),
              )
              terraDrawLayers.forEach((layer: LayerSpecification) => {
                try {
                  mapInstance.removeLayer(layer.id)
                } catch (e) {
                  // Layer might not exist
                }
              })
            }

            // Then remove sources
            if (style.sources) {
              const existingSources = Object.keys(style.sources)
              const terraDrawSources = existingSources.filter((source) => source.startsWith('td-'))

              terraDrawSources.forEach((source) => {
                try {
                  mapInstance.removeSource(source)
                } catch (e) {
                  // Source might not exist
                }
              })
            }
          }

          // Finally remove the control
          mapInstance.removeControl(drawControlRef.current)
        } catch (e) {
          // Control might already be removed
        }
      }
      terradrawControlAdded.current = false
      drawControlRef.current = null
    }
  }, [mapInstance])

  // Initialize TerraDraw when map instance is available
  useEffect(() => {
    if (mapInstance) {
      initializeTerraDraw()
    }
  }, [mapInstance, initializeTerraDraw])

  // Consolidated AOI restoration logic
  useEffect(() => {
    if (!terradrawInstance) return

    if (aoi) {
      restoreAOIToTerraDraw(aoi)
    }
  }, [aoi, terradrawInstance, restoreAOIToTerraDraw])

  return {
    terradrawInstance,
    isRestoring: isRestoringRef.current,
  }
}
