import MapboxDraw, { DrawCreateEvent, DrawMode, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'
import { createStore } from '@xstate/store'
import { MapInstance } from 'react-map-gl/maplibre'
import { Item } from '@/types'

export const DrawModes = {
  DRAW_POLYGON: 'draw_polygon',
  SIMPLE_SELECT: 'simple_select',
} as const

export type MapBounds = [number, number, number, number]

const dataFinderStore = createStore({
  // Initial context
  context: {
    mapInstance: undefined as MapInstance | undefined,
    drawInstance: undefined as MapboxDraw | undefined,
    drawMode: undefined as DrawMode | undefined,
    aoi: undefined as GeoJSON.Feature | undefined,
    mapBounds: undefined as MapBounds | undefined,
    queryFilter: undefined as object | undefined,
    page: 0,
    pinnedItems: [] as Item[],
  },
  // Transitions
  on: {
    pageChange: (context, event: { page: number }) => {
      return {
        ...context,
        page: event.page,
      }
    },
    queryFilterChange: (context, event: { queryFilter: object | undefined }) => {
      return {
        ...context,
        queryFilter: event.queryFilter,
      }
    },
    mapLoad: (context, event: { mapInstance: MapInstance | undefined }) => {
      return {
        ...context,
        mapInstance: event.mapInstance,
      }
    },
    mapBoundsChange: (context) => {
      const { mapInstance } = context

      const bounds = mapInstance?.getBounds()

      if (!bounds) return { ...context }

      // Clip bounds to valid STAC filter range of [-180, -90, 180, 90]
      const clippedBounds: MapBounds = [
        Math.max(-180, bounds.getWest() ?? -180),
        Math.max(-90, bounds.getSouth() ?? -90),
        Math.min(180, bounds.getEast() ?? 180),
        Math.min(90, bounds.getNorth() ?? 90),
      ]

      return {
        ...context,
        mapBounds: clippedBounds,
      }
    },
    drawControlLoad: (context, event: { drawInstance: MapboxDraw | undefined }) => {
      return {
        ...context,
        drawInstance: event.drawInstance,
      }
    },
    drawCreateOrUpdate: (context, event: { mapEvent: DrawCreateEvent }) => {
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
    pinnedItemChange: (context, event: { item: Item; isChecked: boolean }) => {
      const { item, isChecked } = event
      const { pinnedItems } = context

      return {
        ...context,
        pinnedItems: isChecked
          ? [...pinnedItems, item]
          : pinnedItems.filter((checked) => checked.id !== item.id),
      }
    },
  },
})

export default dataFinderStore
