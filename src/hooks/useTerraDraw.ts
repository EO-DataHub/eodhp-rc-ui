import { useCallback, useEffect, useRef } from 'react'
import { useSelector } from '@xstate/store/react'
import { MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw'
import { MapInstance } from 'react-map-gl/maplibre'
import type { LayerSpecification } from 'maplibre-gl'
import { TerraDrawRectangleMode, TerraDrawPolygonMode } from 'terra-draw'
import type { GeoJSONStoreFeatures } from 'terra-draw'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import {
  TERRA_DRAW_CONFIG,
  TerraDrawEvent,
  createAOIFeature,
  isValidPolygonFeature,
  removeAreaLabelLayers,
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
        // If TerraDraw isn't ready, use the ready event to add features when it becomes available
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('not enabled') || errorMessage.includes('already exists')) {
          // Listen for the ready event to add features when TerraDraw is fully initialized
          const onReady = () => {
            try {
              if (terradrawInstance.enabled) {
                terradrawInstance.clear()
                terradrawInstance.addFeatures([aoiFeature])
              }
            } catch (retryError) {
              // Retry failed, ignore
            }
          }

          // Add the ready event listener
          terradrawInstance.on('ready', onReady)
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
            if (mapInstance.getLayer(layer.id)) {
              mapInstance.removeLayer(layer.id)
            }
          })
        }

        // Then remove sources
        if (style.sources) {
          const existingSources = Object.keys(style.sources)
          const terraDrawSources = existingSources.filter((source) => source.startsWith('td-'))

          terraDrawSources.forEach((source) => {
            if (mapInstance.getSource(source)) {
              mapInstance.removeSource(source)
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

    const drawControl = new MaplibreMeasureControl({
      ...TERRA_DRAW_CONFIG,
      modeOptions: {
        rectangle: new TerraDrawRectangleMode({
          styles: {
            fillColor: '#FF0000',
            fillOpacity: 0,
            outlineColor: '#FF0000',
            outlineWidth: 2,
          },
        }),
        polygon: new TerraDrawPolygonMode({
          styles: {
            fillColor: '#FF0000',
            fillOpacity: 0,
            outlineColor: '#FF0000',
            outlineWidth: 2,
          },
        }),
      },
    })
    drawControlRef.current = drawControl

    try {
      mapInstance.addControl(drawControl, 'top-right')
    } catch (error) {
      return
    }

    const setupTerraDraw = () => {
      if (terradrawControlAdded.current) return

      const terraDrawInstance = drawControl.getTerraDrawInstance()

      // Customize tooltips after plugin initialization
      const customizeTooltips = () => {
        const customTooltips = {
          polygon: 'Draw Area of Interest (Polygon)',
          rectangle: 'Draw Area of Interest (Rectangle)',
          select: 'Select and Edit Features',
          delete: 'Delete All Features',
          download: 'Download Features as GeoJSON',
        }

        // Override tooltips after a short delay to ensure buttons are created
        setTimeout(() => {
          Object.entries(customTooltips).forEach(([mode, tooltip]) => {
            // Different button classes for different modes
            let button: HTMLButtonElement | null = null

            if (mode === 'delete' || mode === 'download') {
              // Delete and download buttons don't have the 'add' prefix
              button = document.querySelector(`.maplibregl-terradraw-${mode}-button`)!
            } else {
              // Regular drawing buttons have the 'add' prefix
              button = document.querySelector(`.maplibregl-terradraw-add-${mode}-button`)!
            }

            if (button) {
              button.title = tooltip
            }
          })
        }, 100)
      }

      // Call tooltip customization
      customizeTooltips()

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

            terraDrawInstance.on('finish', (id: string | number) => {
              const snapshot = terraDrawInstance.getSnapshot()
              const feature = snapshot?.find((f: GeoJSONStoreFeatures) => f.id === id)

              if (feature && isValidPolygonFeature(feature)) {
                // Clear any existing features before adding the new one
                if (snapshot && snapshot.length > 1) {
                  terraDrawInstance.clear()
                  // Remove area labels when replacing existing AOI
                  removeAreaLabelLayers(mapInstance)
                  terraDrawInstance.addFeatures([feature])
                }

                const aoiFeature = createAOIFeature(feature)
                dataFinderStore.send({
                  type: 'terradrawFeatureCreate',
                  feature: aoiFeature,
                })

                // Switch to render mode to allow map panning
                try {
                  terraDrawInstance.setMode('render')
                } catch (error) {
                  // Fallback to default mode if render mode is not available
                  try {
                    terraDrawInstance.setMode('default')
                  } catch (error2) {
                    // If both fail, continue without changing mode
                  }
                }

                // Reset the active button states in the toolbar
                if (drawControlRef.current) {
                  // Remove active class from all drawing buttons using the same selector as the plugin
                  const drawingButtons = document.getElementsByClassName(
                    'maplibregl-terradraw-add-control',
                  )
                  for (let i = 0; i < drawingButtons.length; i++) {
                    const button = drawingButtons.item(i)
                    if (button) {
                      button.classList.remove('active')
                    }
                  }
                }
              }
            })

            terraDrawInstance.on('change', (_ids: (string | number)[], type: string) => {
              if (type === 'delete') {
                if (isRestoringRef.current) return
                // Remove area labels when AOI is deleted
                removeAreaLabelLayers(mapInstance)
                dataFinderStore.send({ type: 'terradrawFeatureDelete' })
              }
            })

            // Listen for mode changes through the control events
            drawControl.on('mode-changed', (event: TerraDrawEvent) => {
              const mode = event.mode ?? String(event)

              // When switching to drawing mode, clear existing features
              if (mode === 'polygon' || mode === 'rectangle') {
                const currentSnapshot = terraDrawInstance.getSnapshot()
                if (currentSnapshot && currentSnapshot.length > 0) {
                  terraDrawInstance.clear()
                  // Remove area labels when clearing existing AOI
                  removeAreaLabelLayers(mapInstance)
                  // Also clear the AOI from state and localStorage
                  localStorage.removeItem('aoiData')
                  dataFinderStore.send({ type: 'terradrawFeatureDelete' })
                }
              }

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
                terraDrawInstance.on('finish', (id: string | number) => {
                  const snapshot = terraDrawInstance.getSnapshot()
                  const feature = snapshot?.find((f: GeoJSONStoreFeatures) => f.id === id)

                  if (feature && isValidPolygonFeature(feature)) {
                    if (snapshot && snapshot.length > 1) {
                      terraDrawInstance.clear()
                      // Remove area labels when replacing existing AOI
                      removeAreaLabelLayers(mapInstance)
                      terraDrawInstance.addFeatures([feature])
                    }

                    const aoiFeature = createAOIFeature(feature)
                    dataFinderStore.send({
                      type: 'terradrawFeatureCreate',
                      feature: aoiFeature,
                    })

                    // Switch to render mode to allow map panning
                    try {
                      terraDrawInstance.setMode('render')
                    } catch (error) {
                      // Fallback to default mode if render mode is not available
                      try {
                        terraDrawInstance.setMode('default')
                      } catch (error2) {
                        // If both fail, continue without changing mode
                      }
                    }

                    // Reset the active button states in the toolbar
                    if (drawControlRef.current) {
                      // Remove active class from all drawing buttons using the same selector as the plugin
                      const drawingButtons = document.getElementsByClassName(
                        'maplibregl-terradraw-add-control',
                      )
                      for (let i = 0; i < drawingButtons.length; i++) {
                        const button = drawingButtons.item(i)
                        if (button) {
                          button.classList.remove('active')
                        }
                      }
                    }
                  }
                })

                terraDrawInstance.on('change', (_ids: (string | number)[], type: string) => {
                  if (type === 'delete') {
                    if (isRestoringRef.current) return
                    // Remove area labels when AOI is deleted
                    removeAreaLabelLayers(mapInstance)
                    dataFinderStore.send({ type: 'terradrawFeatureDelete' })
                  }
                })

                // Listen for mode changes through the control events
                drawControl.on('mode-changed', (event: TerraDrawEvent) => {
                  const mode = event.mode ?? String(event)

                  // When switching to drawing mode, clear existing features
                  if (mode === 'polygon' || mode === 'rectangle') {
                    const currentSnapshot = terraDrawInstance.getSnapshot()
                    if (currentSnapshot && currentSnapshot.length > 0) {
                      terraDrawInstance.clear()
                      // Remove area labels when clearing existing AOI
                      removeAreaLabelLayers(mapInstance)
                      // Also clear the AOI from state and localStorage
                      localStorage.removeItem('aoiData')
                      dataFinderStore.send({ type: 'terradrawFeatureDelete' })
                    }
                  }

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

    // Event-driven approach to wait for map readiness
    const setupWhenReady = () => {
      if (mapInstance.isStyleLoaded() && mapInstance.getStyle()?.sources) {
        setupTerraDraw()
      }
    }

    // Listen for map load event
    mapInstance.on('load', setupWhenReady)

    // Also listen for style data events as backup
    mapInstance.on('styledata', setupWhenReady)

    // Check if already ready
    if (mapInstance.isStyleLoaded()) {
      setupWhenReady()
    }

    // Return cleanup function for event listeners
    return () => {
      mapInstance.off('load', setupWhenReady)
      mapInstance.off('styledata', setupWhenReady)
    }
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
                if (mapInstance.getLayer(layer.id)) {
                  mapInstance.removeLayer(layer.id)
                }
              })
            }

            // Then remove sources
            if (style.sources) {
              const existingSources = Object.keys(style.sources)
              const terraDrawSources = existingSources.filter((source) => source.startsWith('td-'))

              terraDrawSources.forEach((source) => {
                if (mapInstance.getSource(source)) {
                  mapInstance.removeSource(source)
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
      const cleanup = initializeTerraDraw()
      return cleanup
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
