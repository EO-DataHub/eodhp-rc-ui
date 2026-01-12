import { useEffect, useRef } from 'react'
import { TerraDraw } from 'terra-draw'
import maplibregl from 'maplibre-gl'
import { moveTerraDrawLayersToTop } from '@/lib/terradraw/helpers/layerManagement'

interface UseTerraDrawLayerManagementOptions {
  mapInstance: maplibregl.Map | null
  terraDrawRef: React.RefObject<TerraDraw | null>
}

/**
 * Hook to manage TerraDraw layer positioning
 * Listens to style changes to keep layers on top
 * @param options - Configuration options
 */
export function useTerraDrawLayerManagement({
  mapInstance,
  terraDrawRef,
}: UseTerraDrawLayerManagementOptions) {
  const styleDataCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!mapInstance || !terraDrawRef.current) return

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

    return () => {
      // Clean up style data listener
      if (styleDataCleanupRef.current) {
        styleDataCleanupRef.current()
        styleDataCleanupRef.current = null
      }
    }
  }, [mapInstance, terraDrawRef])
}
