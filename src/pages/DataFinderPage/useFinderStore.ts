import MapboxDraw, { DrawCreateEvent, DrawMode, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'
import { createStore } from '@xstate/store'
import { MapInstance } from 'react-map-gl/maplibre'
import { Collection, StacRender, Item } from '@/types'
import { collectionRenderingConfig, resolveTilesUrl } from '@/library/collectionRenderingConfig'
import * as turf from '@turf/turf'

export const DrawModes = {
  DRAW_POLYGON: 'draw_polygon',
  SIMPLE_SELECT: 'simple_select',
} as const

export type MapBounds = [number, number, number, number]

export type SecondaryPanel = 'query-filters' | 'item-info' | 'collection-info' | undefined

const PlaceholderRender: StacRender = {
  id: 'default',
  title: 'Default visualization',
  assets: [],
}

const pinnedItemIsEqual = (a: Item, b: Item) =>
  a.id && b.id && a.id === b.id && a.render?.id === b.render?.id

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
    isUserCollection: false, //initially assume that the collection does not belong to the user
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
    toggleItemInfoPanel: (context, event: { item: Item }): typeof context => {
      // Panel is already open with the same item, close it
      if (context.infoPanelItem?.id === event.item.id) {
        return {
          ...context,
          secondaryPanel: undefined,
          infoPanelItem: undefined,
        }
      }

      return {
        ...context,
        secondaryPanel: 'item-info',
        infoPanelItem: event.item,
      }
    },
    closeSecondaryPanel: (context) => {
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
      const isAlreadyPinned = context.pinnedItems.some((pinnedItem) =>
        pinnedItemIsEqual(pinnedItem, event.item),
      )

      if (isAlreadyPinned) return context

      const pinnedItem = {
        ...event.item,
        tilesUrl: resolveTilesUrl(event.item, event.collectionRender) ?? '',
        render: event.collectionRender,
        mapRender: {
          visible: true,
          opacity: 1,
        },
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
          (pinnedItem) => !pinnedItemIsEqual(pinnedItem, event.item),
        ),
      }
    },
    clearAllPinnedItems: {
      pinnedItems: [],
    },
    hoveredItemChange: (context, event: { item: Item | undefined }) => {
      return {
        ...context,
        hoveredItem: event.item,
      }
    },
    toggleItemVisibility: (context, event: { item: Item }) => {
      return {
        ...context,
        pinnedItems: context.pinnedItems.map((pinnedItem) => {
          if (pinnedItem.id === event.item.id && pinnedItem.render?.id === event.item.render?.id) {
            return {
              ...pinnedItem,
              mapRender: {
                ...pinnedItem.mapRender,
                visible: !pinnedItem.mapRender?.visible,
                opacity: pinnedItem.mapRender?.opacity ?? 1,
              },
            }
          }
          return pinnedItem
        }),
      }
    },
    changeItemOpacity: (context, event: { item: Item; opacity: number }) => {
      return {
        ...context,
        pinnedItems: context.pinnedItems.map((pinnedItem) => {
          if (pinnedItem.id === event.item.id && pinnedItem.render?.id === event.item.render?.id) {
            return {
              ...pinnedItem,
              mapRender: {
                ...pinnedItem.mapRender,
                opacity: event.opacity,
                visible: pinnedItem.mapRender?.visible ?? true,
              },
            }
          }
          return pinnedItem
        }),
      }
    },
    zoomToItem: (context, event: { item: Item }) => {
      const { mapInstance } = context
      if (!mapInstance) return context

      const { geometry } = event.item
      if (!geometry) return context

      try {
        const [minX, minY, maxX, maxY] = turf.bbox(geometry)

        mapInstance.fitBounds([minX, minY, maxX, maxY], {
          padding: 20,
          duration: 100,
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to zoom to item:', error)
      }
      return context
    },
    setCollection: (context, event: { collection: Collection }) => {
      const collection = event.collection

      const baseRenders = collectionRenderingConfig[collection.id]?.renders ?? {}

      const renders = {
        ...baseRenders,
        ...collection.renders,
      }

      let collectionRenderOptions = Object.entries(renders).map(([id, render]) => ({
        ...render,
        id,
      }))

      // If no renders are available, create a placeholder render option
      if (collectionRenderOptions.length === 0) {
        collectionRenderOptions = [PlaceholderRender]
      }

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
    setIsUserCollection: (context, event: { isUserCollection: boolean }) => {
      return {
        ...context,
        isUserCollection: event.isUserCollection,
      }
    },
    storeAoi: (context, event: { aoi: GeoJSON.Feature }) => {
      localStorage.setItem('aoi', JSON.stringify(event.aoi))
      return { ...context, aoi: event.aoi }
    },
  },
})

export default dataFinderStore
