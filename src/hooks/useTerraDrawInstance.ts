import { useEffect, useRef, useState } from 'react'
import { TerraDraw } from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import maplibregl from 'maplibre-gl'
import { createTerraDrawModes } from '@/lib/terradraw/constants/terraDrawConfig'
import { moveTerraDrawLayersToTop } from '@/lib/terradraw/helpers/layerManagement'
import { restoreAoiFromStorage } from '@/lib/terradraw/helpers/persistence'
import { notifyAreaChange } from '@/lib/terradraw/helpers/areaUtils'
import { isValidAoiFeature } from '@/lib/terradraw/helpers/featureUtils'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

interface UseTerraDrawInstanceOptions {
  mapInstance: maplibregl.Map | null
  onAreaChange?: (area: number | null) => void
  onCursorPositionChange?: (position: { x: number; y: number } | null) => void
  onInitialized?: (terraDraw: TerraDraw) => void
  lastAoiRef?: React.MutableRefObject<GeoJSON.Feature | undefined>
}

/**
 * Hook to manage TerraDraw instance lifecycle
 * @param options - Configuration options
 * @returns Object with ref to TerraDraw instance and isReady flag
 */
export function useTerraDrawInstance({
  mapInstance,
  onAreaChange,
  onCursorPositionChange,
  onInitialized,
  lastAoiRef,
}: UseTerraDrawInstanceOptions) {
  const terraDrawRef = useRef<TerraDraw | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!mapInstance) return

    // Wait for map style to load
    const initializeTerraDraw = () => {
      const adapter = new TerraDrawMapLibreGLAdapter({
        map: mapInstance,
      })

      const terraDraw = new TerraDraw({
        adapter,
        modes: createTerraDrawModes(),
      })

      terraDraw.start()
      // Start in select mode by default to allow selection and editing
      terraDraw.setMode('select')
      // Clear cursor position when initializing (tooltip should be at AOI center if one exists)
      if (onCursorPositionChange) {
        onCursorPositionChange(null)
      }
      terraDrawRef.current = terraDraw
      setIsReady(true)

      // Move TerraDraw layers to the top after initialization
      // Use setTimeout to ensure layers are created
      void setTimeout(() => {
        moveTerraDrawLayersToTop(mapInstance)
      }, 100)

      // Restore AOI from localStorage if not already in store
      // (storeAoi might have already been called by RestoreAOIDialog)
      const currentAoi = dataFinderStore.getSnapshot().context.aoi
      if (!currentAoi) {
        const storedAoi = restoreAoiFromStorage()
        if (storedAoi) {
          terraDraw.addFeatures([storedAoi as Parameters<typeof terraDraw.addFeatures>[0][0]])
          if (lastAoiRef) {
            lastAoiRef.current = storedAoi
          }
          // Notify area for restored AOI
          notifyAreaChange(storedAoi, onAreaChange)
        }
      } else {
        // AOI already in store, add it to TerraDraw
        if (isValidAoiFeature(currentAoi)) {
          terraDraw.addFeatures([currentAoi as Parameters<typeof terraDraw.addFeatures>[0][0]])
          if (lastAoiRef) {
            lastAoiRef.current = currentAoi
          }
          // Notify area for AOI from store
          notifyAreaChange(currentAoi, onAreaChange)
        }
      }

      // Notify that initialization is complete
      onInitialized?.(terraDraw)
    }

    if (mapInstance.isStyleLoaded()) {
      initializeTerraDraw()
    } else {
      void mapInstance.once('style.load', initializeTerraDraw)
    }

    return () => {
      // Reset callbacks
      if (onCursorPositionChange) {
        onCursorPositionChange(null)
      }
      if (onAreaChange) {
        onAreaChange(null)
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
        setIsReady(false)
      }
    }
  }, [mapInstance, onAreaChange, onCursorPositionChange, onInitialized, lastAoiRef])

  return { terraDrawRef, isReady }
}
