import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from '@xstate/store/react'
import { useItemsQuery } from '@/hooks/useItemsQuery'
import Maplibre, { MapRef, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import { MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw'
import PinnedItemsLayer from './layers/PinnedItems'
import QueryItemsLayer from './layers/QueryItems'
import HoveredItemLayer from './layers/HoveredItem'
import { RestoreAOIDialog } from './RestoreAOIDialog'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { setupLayerOrdering } from '@/library/mapLayerUtils'
/* eslint-disable @typescript-eslint/no-floating-promises */
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

const MAP_STORAGE_KEY = 'mapViewState'

// Define types for better type safety
interface TerraDrawFeature {
  id: string
  geometry: {
    type: string
    coordinates: number[][][]
  }
  properties?: Record<string, unknown>
}

interface TerraDrawEvent {
  mode?: string
}

export const Map = () => {
  const mapRef = useRef<MapRef>(null)
  const { pageItems } = useItemsQuery()

  // Load previous map state from local storage, or use default
  const savedViewState =
    JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) ?? 'null') || DEFAULT_MAP_VIEW
  const [viewState, setViewState] = useState(savedViewState)

  const mapInstance = useSelector(dataFinderStore, (state) => state.context.mapInstance)
  const terradrawInstance = useSelector(dataFinderStore, (state) => state.context.terradrawInstance)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  // Function to restore AOI to TerraDraw
  const restoreAOIToTerraDraw = useCallback(
    (aoiFeature: GeoJSON.Feature) => {
      if (!terradrawInstance || !aoiFeature) return

      try {
        // Set a flag to prevent deletion detection during restoration
        isRestoringRef.current = true

        // Check if there are already features in TerraDraw
        const currentSnapshot = terradrawInstance.getSnapshot()
        const hasExistingFeatures = currentSnapshot && currentSnapshot.length > 0

        if (hasExistingFeatures) {
          // Clear existing features - try different method names
          if (typeof terradrawInstance.deleteAll === 'function') {
            terradrawInstance.deleteAll()
          } else if (typeof terradrawInstance.clear === 'function') {
            terradrawInstance.clear()
          } else if (typeof terradrawInstance.removeAll === 'function') {
            terradrawInstance.removeAll()
          }
        }

        // Add a small delay to ensure TerraDraw is ready
        void setTimeout(() => {
          try {
            // Add the restored AOI
            if (typeof terradrawInstance.addFeatures === 'function') {
              terradrawInstance.addFeatures([aoiFeature])
            } else if (typeof terradrawInstance.add === 'function') {
              terradrawInstance.add([aoiFeature])
            }

            // Reset the restoration flag after a longer delay to ensure all operations complete
            void setTimeout(() => {
              isRestoringRef.current = false
            }, 1000)
          } catch (error) {
            // Silently handle error adding restored AOI
            isRestoringRef.current = false
          }
        }, 100)
      } catch (error) {
        // Silently handle error restoring AOI
        isRestoringRef.current = false
      }
    },
    [terradrawInstance],
  )

  // Restore AOI when it's available in the store
  useEffect(() => {
    if (aoi && terradrawInstance) {
      restoreAOIToTerraDraw(aoi)
    }
  }, [aoi, terradrawInstance, restoreAOIToTerraDraw])

  // Fallback AOI restoration - check localStorage after a delay if no AOI is in store
  useEffect(() => {
    if (!aoi && terradrawInstance) {
      const timeoutId = setTimeout(() => {
        const storedAoi = localStorage.getItem('aoiData')
        if (storedAoi) {
          try {
            const parsedAoi = JSON.parse(storedAoi)
            dataFinderStore.send({ type: 'storeAoi', aoi: parsedAoi })
          } catch (error) {
            // Silently handle error parsing stored AOI
          }
        }
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [aoi, terradrawInstance])

  // Additional restoration check when terradrawInstance becomes available
  useEffect(() => {
    if (terradrawInstance && !aoi) {
      const storedAoi = localStorage.getItem('aoiData')
      if (storedAoi) {
        try {
          const parsedAoi = JSON.parse(storedAoi)
          dataFinderStore.send({ type: 'storeAoi', aoi: parsedAoi })
        } catch (error) {
          // Silently handle error parsing stored AOI
        }
      }
    }
  }, [terradrawInstance, aoi])

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

  useEffect(() => {
    if (!mapInstance) return

    const cleanup = setupLayerOrdering(mapInstance)
    return cleanup
  }, [mapInstance])

  // Add TerraDraw control once on map load
  const terradrawControlAdded = useRef(false)
  const isRestoringRef = useRef(false)

  const handleMapLoad = () => {
    const map = mapRef.current?.getMap()
    if (!map || terradrawControlAdded.current) return

    // Send the map instance to the store
    dataFinderStore.send({ type: 'mapLoad', mapInstance: map })

    const initializeTerraDraw = () => {
      const drawControl = new MaplibreMeasureControl({
        modes: ['polygon', 'rectangle', 'delete', 'download'],
        open: true,
        computeElevation: true,
      })
      map.addControl(drawControl, 'top-right')

      // Wait for map to be fully loaded before setting up TerraDraw
      const setupTerraDraw = () => {
        const terraDrawInstance = drawControl.getTerraDrawInstance()

        if (terraDrawInstance) {
          // Store the TerraDraw instance in the store
          dataFinderStore.send({
            type: 'terradrawControlLoad',
            terradrawInstance: terraDrawInstance,
          })

          // Listen to TerraDraw events
          try {
            terraDrawInstance.on('finish', (id: string) => {
              const snapshot = terraDrawInstance.getSnapshot()
              const feature = snapshot?.find((f: TerraDrawFeature) => f.id === id)

              if (feature?.geometry && feature.geometry.type === 'Polygon') {
                const aoiFeature: GeoJSON.Feature = {
                  type: 'Feature',
                  geometry: feature.geometry,
                  properties: feature.properties || {},
                  id: feature.id || `aoi-${Date.now()}`,
                }
                dataFinderStore.send({
                  type: 'terradrawFeatureCreate',
                  feature: aoiFeature,
                })
              }
            })
            terraDrawInstance.on('delete', () => {
              if (isRestoringRef.current) {
                return
              }
              dataFinderStore.send({ type: 'terradrawFeatureDelete' })
            })
            terraDrawInstance.on('modechange', (event: TerraDrawEvent) => {
              const mode = event.mode ?? String(event)
              dataFinderStore.send({
                type: 'terradrawModeChange',
                mode: mode,
              })
            })
          } catch (error) {
            // Silently handle error setting up TerraDraw event listeners
          }
        }
        terradrawControlAdded.current = true
        handleMapBoundsChange()
      }

      // Wait for map to be fully loaded
      if (map.isStyleLoaded()) {
        // Add a small delay to ensure the control is added
        void setTimeout(setupTerraDraw, 100)
      } else {
        map.once('load', () => {
          void setTimeout(setupTerraDraw, 100)
        })
      }
    }

    // Check if map is already loaded
    if (map.isStyleLoaded()) {
      void initializeTerraDraw()
    } else {
      map.once('load', () => {
        void initializeTerraDraw()
      })
    }
  }

  return (
    <>
      <Maplibre
        initialViewState={viewState}
        mapStyle={MAP_STYLE}
        ref={mapRef}
        onMoveEnd={handleMapBoundsChange}
        onLoad={handleMapLoad}
      >
        <NavigationControl />
        <PinnedItemsLayer />
        <QueryItemsLayer queryItems={pageItems} />
        <HoveredItemLayer />
      </Maplibre>
      <RestoreAOIDialog />
    </>
  )
}
