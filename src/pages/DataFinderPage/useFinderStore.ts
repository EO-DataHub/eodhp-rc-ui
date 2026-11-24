import MapboxDraw, { DrawCreateEvent, DrawMode, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'
import { createStore } from '@xstate/store'
import { MapInstance } from 'react-map-gl/maplibre'
import { Collection, StacRender, Item, ProcessRecord } from '@/types'
import {
  collectionRenderingConfig,
  resolveTilesUrl,
  getCollectionConfigKey,
  PLACEHOLDER_RENDER,
} from '@/library/collectionRenderingConfig'
import { movePinnedItem } from '@/library/pinnedLayerOrder'
import type { RunSource } from '@/hooks/useWorkflowRun'
import type { VisitJob } from '@/library/runPanelJobs'
import { getPinnedItemId, refreshPinnedItems } from '@/library/pinnedItemRenders'
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

/** Which of the run panel and the secondary panel is drawn above the other where they overlap */
export type TopPanel = 'run' | 'secondary'

export type InfoPanelTab = 'metadata' | 'assets' | 'resources' | 'download'

export type CollectionInfoTab =
  | 'metadata'
  | 'assets'
  | 'providers'
  | 'resources'
  | 'qa_documentation'
  | 'qa_validation'

interface AppContext {
  isContextHydrated: boolean
  isLoading: boolean
  secondaryPanel: SecondaryPanel
  collectionInfoTab: CollectionInfoTab
  infoPanelItem?: Item
  infoPanelTab: InfoPanelTab
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
  chosenTool?: ProcessRecord
  /** Counts "Open in" requests so the panel can return to the chosen notebook each time */
  integrationToolsOpenCount: number
  isRunPanelOpen: boolean
  topPanel: TopPanel
  /** What a workflow runs on, kept while the run panel is hidden or no workflow is chosen */
  runSource?: RunSource
  /** The item for the "This item" source */
  runItem?: Item
  /** Jobs started from the run panel in this visit, for the badge and the Workflow outputs tab */
  visitJobs: VisitJob[]
  /** Counts requests to open the sidebar's dataset list, for example after choosing a tool */
  datasetListRequestCount: number
}

export { getPinnedItemId }

const dataFinderStore = createStore({
  // Initial context
  context: {
    isContextHydrated: false,
    isLoading: true, // flag to indicate if the initial data is loading (replacement to useQuery 'isLoading')
    secondaryPanel: undefined,
    collectionInfoTab: 'metadata',
    infoPanelItem: undefined,
    infoPanelTab: 'metadata',
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
    chosenTool: undefined,
    integrationToolsOpenCount: 0,
    isRunPanelOpen: false,
    topPanel: 'run',
    runSource: undefined,
    runItem: undefined,
    visitJobs: [],
    datasetListRequestCount: 0,
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
              // Saved renders can be out of date with this version's configuration.
              pinnedItems: refreshPinnedItems(contextFromLocalStorage.pinnedItems ?? []),
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
    setSecondaryPanel: (context, event: { panel: SecondaryPanel }): typeof context => {
      return {
        ...context,
        secondaryPanel: event.panel,
        topPanel: event.panel ? 'secondary' : context.topPanel,
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
        topPanel: 'secondary',
        collectionInfoTab: event.tab,
      }
    },
    setCollectionInfoTab: (context, event: { tab: CollectionInfoTab }) => {
      return {
        ...context,
        collectionInfoTab: event.tab,
      }
    },
    toggleItemInfoPanel: (context, event: { item: Item; tab?: InfoPanelTab }): typeof context => {
      const tab = event.tab ?? 'metadata'
      const isOpenForItem =
        context.infoPanelItem?.id === event.item.id && context.secondaryPanel === 'item-info'
      // The card's download button owns the Download tab and the info button owns the rest
      const isSameButton = (tab === 'download') === (context.infoPanelTab === 'download')

      // Panel is already open with the same item from the same button, close it
      if (isOpenForItem && isSameButton) {
        return {
          ...context,
          secondaryPanel: undefined,
          infoPanelItem: undefined,
        }
      }

      return {
        ...context,
        secondaryPanel: 'item-info',
        topPanel: 'secondary',
        infoPanelItem: event.item,
        infoPanelTab: tab,
      }
    },
    setInfoPanelTab: (context, event: { tab: InfoPanelTab }) => {
      return {
        ...context,
        infoPanelTab: event.tab,
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
        topPanel: 'secondary',
        infoPanelItem: event.item,
      }
    },
    openIntegrationToolsPanel: (context, event: { item: Item }): typeof context => ({
      ...context,
      secondaryPanel: 'integration-tools',
      topPanel: 'secondary',
      infoPanelItem: event.item,
      integrationToolsOpenCount: context.integrationToolsOpenCount + 1,
    }),
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
    movePinnedItem: (context, event: { fromPinId: string; toPinId: string }) => {
      return {
        ...context,
        pinnedItems: movePinnedItem(context.pinnedItems, event.fromPinId, event.toPinId),
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
        collectionRenderOptions = [PLACEHOLDER_RENDER]
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
    chooseTool: (context, event: { tool: ProcessRecord }) => ({
      ...context,
      chosenTool: event.tool,
    }),
    /** Clears the tool and the item chosen for it, so the next tool does not open on a stale item */
    clearTool: (context) => ({
      ...context,
      chosenTool: undefined,
      runItem: undefined,
      runSource: context.runSource === 'item' ? undefined : context.runSource,
    }),
    openRunPanel: (context, event: { source?: RunSource; item?: Item }): typeof context => ({
      ...context,
      isRunPanelOpen: true,
      topPanel: 'run',
      runSource: event.source ?? context.runSource,
      runItem: event.item ?? context.runItem,
    }),
    hideRunPanel: (context) => ({ ...context, isRunPanelOpen: false }),
    /** A press inside a panel brings it above the other */
    bringPanelToTop: (context, event: { panel: TopPanel }): typeof context =>
      context.topPanel === event.panel ? context : { ...context, topPanel: event.panel },
    setRunSource: (context, event: { source: RunSource }) => ({
      ...context,
      runSource: event.source,
    }),
    /** Hides the run panel and forgets what it was set to run on, for example on leaving the page */
    resetRunPanel: (context) => ({
      ...context,
      isRunPanelOpen: false,
      runSource: undefined,
      runItem: undefined,
      visitJobs: [],
    }),
    addVisitJobs: (context, event: { jobs: VisitJob[] }) => {
      const known = new Set(context.visitJobs.map((job) => job.jobId))
      const added = event.jobs.filter((job) => {
        if (known.has(job.jobId)) return false
        known.add(job.jobId)
        return true
      })
      return added.length ? { ...context, visitJobs: [...context.visitJobs, ...added] } : context
    },
    clearVisitJobs: (context) => ({ ...context, visitJobs: [] }),
    requestDatasetList: (context) => ({
      ...context,
      datasetListRequestCount: context.datasetListRequestCount + 1,
    }),
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
