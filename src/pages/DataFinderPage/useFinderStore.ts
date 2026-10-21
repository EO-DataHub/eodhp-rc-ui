import MapboxDraw, { DrawCreateEvent, DrawMode, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'
import { createStore } from '@xstate/store'
import { MapInstance } from 'react-map-gl/maplibre'
import { Collection, StacRender, Item } from '@/types'
import {
  collectionRenderingConfig,
  resolveTilesUrl,
  getCollectionConfigKey,
} from '@/library/collectionRenderingConfig'
import * as turf from '@turf/turf'

const LOCAL_STORAGE_CONTEXT_KEY = 'dataFinderStoreContext'
const PERSISTED_CONTEXT_KEYS = ['pinnedItems']

export const DrawModes = {
  DRAW_POLYGON: 'draw_polygon',
  SIMPLE_SELECT: 'simple_select',
} as const

export type MapBounds = [number, number, number, number]

export type SecondaryPanel =
  | 'query-filters'
  | 'item-info'
  | 'collection-info'
  | 'integration-tools'
  | undefined

export type CollectionInfoTab =
  | 'metadata'
  | 'assets'
  | 'providers'
  | 'resources'
  | 'qa_documentation'
  | 'qa_validation'

const PlaceholderRender: StacRender = {
  id: 'default',
  title: 'Default visualization',
  assets: [],
}

interface AppContext {
  isContextHydrated: boolean
  isLoading: boolean
  secondaryPanel: SecondaryPanel
  collectionInfoTab: CollectionInfoTab
  infoPanelItem?: Item
  mapInstance?: MapInstance
  drawInstance?: MapboxDraw
  drawMode?: DrawMode
  aoi?: GeoJSON.Feature
  mapBounds?: MapBounds
  initialBounds?: MapBounds
  queryFilter?: object
  page: number
  pinnedItems: Item[]
  hoveredItem?: Item
  collection?: Collection
  collectionRenderOptions: StacRender[]
  collectionRender?: StacRender
  isUserCollection: boolean
}

// Build a unique id for pinned items
export const getPinnedItemId = (item: Item, collectionRender: StacRender) =>
  [item.id, collectionRender.id].join('-')

const dataFinderStore = createStore({
  // Initial context
  context: {
    isContextHydrated: false,
    isLoading: true, // flag to indicate if the initial data is loading (replacement to useQuery 'isLoading')
    secondaryPanel: undefined,
    collectionInfoTab: 'metadata',
    infoPanelItem: undefined,
    mapInstance: undefined,
    drawInstance: undefined,
    drawMode: undefined,
    aoi: undefined,
    mapBounds: undefined,
    initialBounds: undefined,
    queryFilter: undefined,
    page: 0,
    pinnedItems: [],
    hoveredItem: undefined,
    collection: undefined,
    collectionRenderOptions: [],
    collectionRender: undefined,
    isUserCollection: false,
  } as AppContext,
  // Transitions
  on: {
    hydrateFromLocalStorage: (context) => {
      const contextJson = localStorage.getItem(LOCAL_STORAGE_CONTEXT_KEY)
      if (!context.isContextHydrated) {
        try {
          if (contextJson) {
            const contextFromLocalStorage = JSON.parse(contextJson) as Partial<AppContext>

            return {
              ...context,
              isContextHydrated: true,
              ...contextFromLocalStorage,
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to load context from local storage:', error)
        }
      }
      return context
    },

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
        // Opening the collection info panel generically always starts on the first tab
        collectionInfoTab:
          event.panel === 'collection-info' ? 'metadata' : context.collectionInfoTab,
      }
    },
    toggleCollectionInfoTab: (context, event: { tab: CollectionInfoTab }): typeof context => {
      // Panel is already open on the requested tab, close it
      if (context.secondaryPanel === 'collection-info' && context.collectionInfoTab === event.tab) {
        return {
          ...context,
          secondaryPanel: undefined,
        }
      }

      return {
        ...context,
        secondaryPanel: 'collection-info',
        collectionInfoTab: event.tab,
      }
    },
    setCollectionInfoTab: (context, event: { tab: CollectionInfoTab }) => {
      return {
        ...context,
        collectionInfoTab: event.tab,
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
    toggleIntegrationToolsPanel: (context, event: { item: Item }): typeof context => {
      // Panel is already open with the same item, close it
      if (
        context.infoPanelItem?.id === event.item.id &&
        context.secondaryPanel === 'integration-tools'
      ) {
        return {
          ...context,
          secondaryPanel: undefined,
          infoPanelItem: undefined,
        }
      }

      return {
        ...context,
        secondaryPanel: 'integration-tools',
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
    setInitialBounds: (context, event: { bounds: MapBounds }) => ({
      ...context,
      initialBounds: event.bounds,
    }),
    clearInitialBounds: (context) => ({
      ...context,
      initialBounds: undefined,
    }),

    drawControlLoad: (context, event: { drawInstance: MapboxDraw | undefined }) => {
      return {
        ...context,
        drawInstance: event.drawInstance,
      }
    },
    drawCreateOrUpdate: (
      context,
      event: { mapEvent: DrawCreateEvent | { features: GeoJSON.Feature[] } },
    ) => {
      const { features } = event.mapEvent
      const aoi = features[0]

      localStorage.setItem('aoiData', JSON.stringify(aoi))

      return {
        ...context,
        aoi,
      }
    },
    drawDelete: (context) => {
      localStorage.removeItem('aoiData')
      // Only call deleteAll if drawInstance exists (MapboxDraw)
      if (context.drawInstance) {
        context.drawInstance.deleteAll()
      }

      return {
        ...context,
        aoi: undefined,
      }
    },
    drawModeChange: (context, event: { mapEvent: DrawModeChangeEvent }) => {
      const { aoi: currentAoi, drawInstance, mapInstance } = context
      const { mode: nextDrawMode } = event.mapEvent

      // Ensure draw instance exists to avoid type errors
      if (!drawInstance) return context

      if (nextDrawMode === DrawModes.DRAW_POLYGON) {
        // User started drawing a new polygon, delete the current AOI if it exists
        if (currentAoi) {
          drawInstance.delete(currentAoi.id as string)
        }

        const handleDblClick = () => {
          // Wait a bit for draw to be register and then change selection
          setTimeout(() => {
            drawInstance.changeMode('simple_select')
          }, 100)
          mapInstance!.off('dblclick', handleDblClick)
        }
        mapInstance!.on('dblclick', handleDblClick)
      }

      return {
        ...context,
        drawMode: nextDrawMode,
      }
    },
    addPinnedItem: (
      context,
      event: {
        item: Item
        collectionRender: StacRender
        isLicenseProprietary: boolean
        isUserCollection: boolean
        collectionName: string
        collection?: Collection
      },
    ): typeof context => {
      const pinnedItemId = getPinnedItemId(event.item, event.collectionRender)
      const isAlreadyPinned = context.pinnedItems.some((i) => i.pinId === pinnedItemId)

      if (isAlreadyPinned) return context

      const pinnedItem = {
        ...event.item,
        pinId: pinnedItemId,
        tilesUrl: resolveTilesUrl(event.item, event.collectionRender, event.isUserCollection) ?? '',
        isLicenseProprietary: event.isLicenseProprietary,
        isUserCollection: event.isUserCollection,
        collectionName: event.collectionName,
        collectionRef: event.collection,
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
        pinnedItems: context.pinnedItems.filter((i) => i.pinId !== event.item.pinId),
      }
    },
    addPinnedItems: (
      context,
      event: {
        items: Item[]
        collectionRender: StacRender
        isLicenseProprietary: boolean
        isUserCollection: boolean
        collectionName: string
        collection?: Collection
        /** Map state per item id, e.g. when opening a saved set. Defaults to visible at full opacity. */
        mapRenderByItemId?: Record<string, { visible: boolean; opacity: number }>
      },
    ): typeof context => {
      const existingIds = new Set(context.pinnedItems.map((i) => i.pinId))
      const newPinnedItems = event.items
        .filter((item) => {
          const pinId = getPinnedItemId(item, event.collectionRender)
          if (existingIds.has(pinId)) return false
          existingIds.add(pinId)
          return true
        })
        .map((item) => ({
          ...item,
          pinId: getPinnedItemId(item, event.collectionRender),
          tilesUrl: resolveTilesUrl(item, event.collectionRender, event.isUserCollection) ?? '',
          isLicenseProprietary: event.isLicenseProprietary,
          isUserCollection: event.isUserCollection,
          collectionName: event.collectionName,
          collectionRef: event.collection,
          render: event.collectionRender,
          mapRender: event.mapRenderByItemId?.[item.id] ?? { visible: true, opacity: 1 },
        }))
      return {
        ...context,
        pinnedItems: [...context.pinnedItems, ...newPinnedItems],
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
        // Silently fail if zoom fails
      }
      return context
    },
    setCollection: (
      context: AppContext,
      event: { collection: Collection; isUserCollection?: boolean },
    ) => {
      const collection = event.collection
      const isUserCollection = event.isUserCollection ?? context.isUserCollection
      const collectionConfig =
        collectionRenderingConfig[getCollectionConfigKey(collection.id, isUserCollection)]

      const baseRenders = collectionConfig?.renders ?? {}
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

      // Merge in the collection configuration
      const mergedCollection = {
        ...collection,
        'eodhrc:time-variable-items':
          collectionConfig?.['eodhrc:time-variable-items'] ??
          collection['eodhrc:time-variable-items'],
        'eodhrc:render-key-properties':
          collectionConfig?.['eodhrc:render-key-properties'] ??
          collection['eodhrc:render-key-properties'],
      }

      return {
        ...context,
        collection: mergedCollection,
        collectionRenderOptions,
        collectionRender: collectionRenderOptions[0] ?? undefined,
        isUserCollection: event.isUserCollection ?? context.isUserCollection,
        // Close info panel and clear infoPanelItem when switching collections
        secondaryPanel: undefined,
        infoPanelItem: undefined,
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
    storeAoi: (context, event: { aoi: GeoJSON.Feature | undefined }) => {
      if (event.aoi) {
        localStorage.setItem('aoiData', JSON.stringify(event.aoi))
      } else {
        localStorage.removeItem('aoiData')
      }
      return { ...context, aoi: event.aoi }
    },
  },
})

// This inspector is used to persist some parts of the context to local storage
// on every state change but the initial state and onMount.
dataFinderStore.inspect((inspectEvent) => {
  if (inspectEvent.type === '@xstate.snapshot') {
    const { event } = inspectEvent

    // Do not save the context to local storage on initial state
    if (!['@xstate.init'].includes(event.type)) {
      // @ts-expect-error - snapshot is not typed correctly
      const context = inspectEvent.snapshot.context

      const persistedContext = Object.fromEntries(
        PERSISTED_CONTEXT_KEYS.map((key) => [key, context[key]]),
      )

      try {
        localStorage.setItem(LOCAL_STORAGE_CONTEXT_KEY, JSON.stringify(persistedContext))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to save context to local storage:', error)
      }
    }
  }
})

export default dataFinderStore
