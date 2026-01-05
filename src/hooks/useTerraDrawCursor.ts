import { useEffect, useRef } from 'react'
import { TerraDraw } from 'terra-draw'
import maplibregl from 'maplibre-gl'
import { calculateAoiArea } from '@/library/geoUtils'

interface UseTerraDrawCursorOptions {
  mapInstance: maplibregl.Map | null
  terraDrawRef: React.RefObject<TerraDraw | null>
  onCursorPositionChange?: (position: { x: number; y: number } | null) => void
  onAreaChange?: (area: number | null) => void
}

/**
 * Hook to track cursor position during drawing
 * Handles mousemove events with RAF throttling
 * @param options - Configuration options
 */
export function useTerraDrawCursor({
  mapInstance,
  terraDrawRef,
  onCursorPositionChange,
  onAreaChange,
}: UseTerraDrawCursorOptions) {
  const mouseMoveCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!mapInstance) return

    // single rAF-throttled mousemove listener
    // - computes area only when actively drawing
    // - sends cursor position while drawing so the tooltip follows the cursor
    // - resets cursor position when not drawing so the tooltip returns to AOI centroid
    const container = mapInstance.getContainer()
    if (!container) return

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

    return () => {
      // Remove mouse move listener if registered
      if (mouseMoveCleanupRef.current) {
        mouseMoveCleanupRef.current()
        mouseMoveCleanupRef.current = null
      }
    }
  }, [mapInstance, terraDrawRef, onCursorPositionChange, onAreaChange])
}
