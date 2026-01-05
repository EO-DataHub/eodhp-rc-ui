import { useEffect } from 'react'
import { TerraDraw } from 'terra-draw'
import maplibregl from 'maplibre-gl'
import { moveTerraDrawLayersToTop } from '@/lib/terradraw/helpers/layerManagement'

interface UseTerraDrawModeOptions {
  terraDrawRef: React.RefObject<TerraDraw | null>
  mode: 'rectangle' | 'polygon' | null | undefined
  mapInstance: maplibregl.Map | null
  onDrawingStateChange?: (isDrawing: boolean) => void
  onCursorPositionChange?: (position: { x: number; y: number } | null) => void
}

/**
 * Hook to manage TerraDraw mode switching
 * @param options - Configuration options
 */
export function useTerraDrawMode({
  terraDrawRef,
  mode,
  mapInstance,
  onDrawingStateChange,
  onCursorPositionChange,
}: UseTerraDrawModeOptions) {
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
  }, [mode, mapInstance, terraDrawRef, onDrawingStateChange, onCursorPositionChange])
}
