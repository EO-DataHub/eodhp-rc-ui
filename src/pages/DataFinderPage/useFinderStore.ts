import MapboxDraw, { DrawCreateEvent, DrawMode, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'
import { createStore } from '@xstate/store'
import { MapInstance } from 'react-map-gl/maplibre'

const DrawModes = {
  DRAW_POLYGON: 'draw_polygon',
  SIMPLE_SELECT: 'simple_select',
} as const

const dataFinderStore = createStore({
  // Initial context
  context: {
    mapInstance: undefined as MapInstance | undefined,
    drawInstance: undefined as MapboxDraw | undefined,
    drawMode: undefined as DrawMode | undefined,
    aoi: undefined as GeoJSON.Feature | undefined,
  },
  // Transitions
  on: {
    mapLoad: (context, event: { mapInstance: MapInstance | undefined }) => {
      return {
        ...context,
        mapInstance: event.mapInstance,
      }
    },
    drawControlLoad: (context, event: { drawInstance: MapboxDraw | undefined }) => {
      return {
        ...context,
        drawInstance: event.drawInstance,
      }
    },
    drawCreate: (context, event: { mapEvent: DrawCreateEvent }) => {
      // If draw instance is not loaded, do nothing
      if (!context.drawInstance) return context

      const { features } = event.mapEvent
      const aoi = features[0]

      return {
        ...context,
        aoi,
      }
    },
    drawDelete: (context) => {
      return {
        ...context,
        aoi: undefined,
      }
    },
    drawModeChange: (context, event: { mapEvent: DrawModeChangeEvent }) => {
      const { drawMode: currentDrawMode, aoi: currentAoi, drawInstance } = context
      const { mode: nextDrawMode } = event.mapEvent

      // Ensure draw instance exists to avoid type errors
      if (!drawInstance) return context

      // User started drawing a new polygon, delete the current AOI if it exists
      if (currentDrawMode === DrawModes.SIMPLE_SELECT && nextDrawMode === DrawModes.DRAW_POLYGON) {
        if (currentAoi) {
          drawInstance.delete(currentAoi.id as string)
        }
      }

      return {
        ...context,
        drawMode: nextDrawMode,
      }
    },
  },
})

export default dataFinderStore
