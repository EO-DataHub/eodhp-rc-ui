import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useTerraDrawInstance } from '@/hooks/useTerraDrawInstance'
import { useTerraDrawMode } from '@/hooks/useTerraDrawMode'
import { useTerraDrawEvents } from '@/hooks/useTerraDrawEvents'
import { useTerraDrawSync } from '@/hooks/useTerraDrawSync'
import { useTerraDrawCursor } from '@/hooks/useTerraDrawCursor'
import { useTerraDrawLayerManagement } from '@/hooks/useTerraDrawLayerManagement'
import { getExistingFeatureIds } from '@/lib/terradraw/helpers/featureUtils'
import { isValidAoiFeature } from '@/lib/terradraw/helpers/featureUtils'

interface TerraDrawControlProps {
  mapInstance: maplibregl.Map | null
  mode?: 'rectangle' | 'polygon' | null
  onAreaChange?: (area: number | null) => void
  onCursorPositionChange?: (position: { x: number; y: number } | null) => void
  onDrawingStateChange?: (isDrawing: boolean) => void
  onDrawingComplete?: () => void
}

export interface TerraDrawControlRef {
  delete: () => void
  add: (feature: GeoJSON.Feature) => void
  isDrawing: () => boolean
}

export const TerraDrawControl = forwardRef<TerraDrawControlRef, TerraDrawControlProps>(
  (
    {
      mapInstance,
      mode,
      onAreaChange,
      onCursorPositionChange,
      onDrawingStateChange,
      onDrawingComplete,
    },
    ref,
  ) => {
    const modeRef = useRef<'rectangle' | 'polygon' | null>(mode ?? null)
    const onDrawingCompleteRef = useRef(onDrawingComplete)
    const lastAoiRef = useRef<GeoJSON.Feature | undefined>(undefined)
    const isUpdatingFromTerraDrawRef = useRef(false)

    // Update mode ref when mode changes
    useEffect(() => {
      modeRef.current = mode ?? null
    }, [mode])

    // Update callback ref when callback changes
    useEffect(() => {
      onDrawingCompleteRef.current = onDrawingComplete
    }, [onDrawingComplete])

    // Initialize TerraDraw instance
    const { terraDrawRef, isReady } = useTerraDrawInstance({
      mapInstance,
      onAreaChange,
      onCursorPositionChange,
      lastAoiRef,
    })

    // Handle mode changes
    useTerraDrawMode({
      terraDrawRef,
      mode,
      mapInstance,
      onDrawingStateChange,
      onCursorPositionChange,
    })

    // Handle TerraDraw events
    useTerraDrawEvents({
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
    })

    // Sync store AOI with TerraDraw
    useTerraDrawSync({
      terraDrawRef,
      isUpdatingFromTerraDrawRef,
      lastAoiRef,
    })

    // Handle cursor position tracking
    useTerraDrawCursor({
      mapInstance,
      terraDrawRef,
      onCursorPositionChange,
      onAreaChange,
    })

    // Handle layer management
    useTerraDrawLayerManagement({
      mapInstance,
      terraDrawRef,
    })

    // Imperative handle for parent component
    useImperativeHandle(ref, () => ({
      isDrawing: () => {
        if (!terraDrawRef.current) return false
        try {
          const modeState = terraDrawRef.current.getModeState()
          // Only return true when TerraDraw is actively drawing
          // This ensures the tooltip disappears as soon as the AOI is drawn,
          // even if the drawing mode is still on
          return modeState === 'drawing'
        } catch {
          return false
        }
      },
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
            const existingIds = getExistingFeatureIds(terraDraw)
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
        if (!terraDrawRef.current || !isValidAoiFeature(feature)) {
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
            const existingIds = getExistingFeatureIds(terraDraw)
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

    return null
  },
)

TerraDrawControl.displayName = 'TerraDrawControl'
