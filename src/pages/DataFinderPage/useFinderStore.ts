import MapboxDraw, { DrawCreateEvent, DrawMode, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'
import { createStore } from '@xstate/store'
import { MapInstance } from 'react-map-gl/maplibre'
import { Collection, StacRender, Item } from '@/types'
import { collectionRenderingConfig, resolveTilesUrl } from '@/library/collectionRenderingConfig'

export const DrawModes = {
  DRAW_POLYGON: 'draw_polygon',
  SIMPLE_SELECT: 'simple_select',
} as const

export type MapBounds = [number, number, number, number]

export type SecondaryPanel = 'query-filters' | 'item-info' | 'collection-info' | undefined

const dataFinderStore = createStore({
  // Initial context
  context: {
    isLoading: true, // flag to indicate if the initial data is loading (replacement to useQuery 'isLoading')
    secondaryPanel: undefined as SecondaryPanel,
    infoPanelItem: undefined as Item | undefined,
    mapInstance: undefined as MapInstance | undefined,
    drawInstance: undefined as MapboxDraw | undefined,
    drawMode: undefined as DrawMode | undefined,
    aoi: undefined as GeoJSON.Feature | undefined,
    mapBounds: undefined as MapBounds | undefined,
    queryFilter: undefined as object | undefined,
    page: 0,
    pinnedItems: [] as Item[],
    hoveredItem: undefined as Item | undefined,
    collection: undefined as Collection | undefined,
    collectionRenderOptions: [] as StacRender[],
    collectionRender: undefined as StacRender | undefined,
  },
  // Transitions
  on: {
    onFetched: (context) => {
      return {
        ...context,
        isLoading: false,
        page: 0,
      }
    },
    setSecondaryPanel: (context, event: { panel: SecondaryPanel }) => {
      return {
        ...context,
        secondaryPanel: event.panel,
      }
    },
    openItemInfoPanel: (context, event: { item: Item }): typeof context => {
      return {
        ...context,
        secondaryPanel: 'item-info',
        infoPanelItem: event.item,
      }
    },
    closeItemInfoPanel: (context) => {
      return {
        ...context,
        secondaryPanel: undefined,
        infoPanelItem: undefined,
      }
    },
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
    addPinnedItem: (
      context,
      event: { item: Item; collectionRender: StacRender },
    ): typeof context => {
      const isAlreadyPinned = context.pinnedItems.some(
        (pinnedItem) =>
          pinnedItem.id === event.item.id && pinnedItem.render?.id === event.collectionRender.id,
      )

      if (isAlreadyPinned) return context

      const pinnedItem = {
        ...event.item,
        tilesUrl: resolveTilesUrl(event.item, event.collectionRender) ?? '',
        render: event.collectionRender,
      }

      return {
        ...context,
        pinnedItems: [...context.pinnedItems, pinnedItem],
      }
    },
    removePinnedItem: (context, event: { item: Item }) => {
      return {
        ...context,
        pinnedItems: context.pinnedItems.filter(
          (pinnedItem) =>
            // Pinned items are considered equal if their IDs and render IDs match
            pinnedItem.id !== event.item.id || pinnedItem.render?.id !== event.item.render?.id,
        ),
      }
    },
    hoveredItemChange: (context, event: { item: Item | undefined }) => {
      return {
        ...context,
        hoveredItem: event.item,
      }
    },
    setCollection: (context, event: { collection: Collection }) => {
      const collection = event.collection

      const baseRenders = collectionRenderingConfig[collection.id]?.renders ?? {}

      const renders = {
        ...baseRenders,
        ...collection.renders,
      }

      const collectionRenderOptions = Object.entries(renders).map(([id, render]) => ({
        ...render,
        id,
      }))

      return {
        ...context,
        collection: event.collection,
        collectionRenderOptions,
        collectionRender: collectionRenderOptions[0] ?? undefined,
      }
    },
    setCollectionRender: (_, event: { collectionRender: StacRender | undefined }) => ({
      collectionRender: event.collectionRender,
    }),
    storeAoi: (context, event: { aoi: GeoJSON.Feature }) => {
      localStorage.setItem('aoi', JSON.stringify(event.aoi))
      return { ...context, aoi: event.aoi }
    },
  },
})

export default dataFinderStore
