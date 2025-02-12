import { useEffect, useRef } from 'react'
import Maplibre, {
  IControl,
  Layer,
  MapRef,
  NavigationControl,
  Source,
  useControl,
} from 'react-map-gl/maplibre'
import MapboxDraw, { DrawCreateEvent, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'

import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

import dataFinderStore, { DrawModes } from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'

import { Item } from '@/types'

const TITILER_URL = import.meta.env.VITE_TITILER_BASE_URL

const LIST_ITEM_LINE_PAINT_STYLE = {
  'line-color': '#3a5bc7',
  'line-width': 2,
}

interface DrawConstants {
  classes: {
    CONTROL_BASE: string
    CONTROL_PREFIX: string
    CONTROL_GROUP: string
  }
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

function DrawControl() {
  const drawInstance = useRef<MapboxDraw | null>(null)

  useControl(
    () => {
      const mapboxDrawConstants = MapboxDraw.constants as unknown as DrawConstants
      mapboxDrawConstants.classes.CONTROL_BASE = 'maplibregl-ctrl'
      mapboxDrawConstants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-'
      mapboxDrawConstants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group'

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
      })
      drawInstance.current = draw

      dataFinderStore.send({ type: 'drawControlLoad', drawInstance: draw })

      return draw as unknown as IControl
    },
    {
      position: 'top-right',
    },
  )
  return null
}

const ItemLayer = ({ item }: { item: Item }) => {
  const itemId = item.id
  const tilesUrl = `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url=${item.assets.cog.href}&bidx=1&bidx=2&bidx=3&rescale=0,1000`
  return (
    <>
      <Source type="raster" tileSize={256} tiles={[tilesUrl]}>
        <Layer type="raster" />
      </Source>
      <Source id={`source-${itemId}-bounds`} type="geojson" data={item.geometry}>
        <Layer type="line" paint={LIST_ITEM_LINE_PAINT_STYLE} />
      </Source>
    </>
  )
}

export const Map = ({ visibleItems }: { visibleItems: Item[] }) => {
  const mapRef = useRef<MapRef>(null)

  const handleMapBoundsChange = () => dataFinderStore.send({ type: 'mapBoundsChange' })

  const isDrawing = useSelector(
    dataFinderStore,
    (state) => state.context.drawMode === DrawModes.DRAW_POLYGON,
  )

  // This is a workaround to move the draw layers to the top as they are added
  // on page load and should be on top of the other layers. Ideally we not need
  // to do this but there is no way to control the order of the layers in the
  // MapboxDraw control.
  const mapInstance = useSelector(dataFinderStore, (state) => state.context.mapInstance)
  useEffect(() => {
    if (!mapInstance) return

    // Wait a bit for the layers to be added
    setTimeout(() => {
      mapInstance.getStyle().layers.forEach((layer) => {
        if (layer.id.startsWith('gl-draw')) {
          mapInstance.moveLayer(layer.id)
        }
      })
    }, 100)
  }, [mapInstance, visibleItems])

  return (
    <Maplibre
      initialViewState={DEFAULT_MAP_VIEW}
      mapStyle={MAP_STYLE}
      ref={mapRef}
      cursor={isDrawing ? 'crosshair' : 'grab'}
      onLoad={() => {
        const mapInstance = mapRef.current?.getMap()
        if (!mapInstance) {
          return
        }
        // Send the map instance to the store
        dataFinderStore.send({ type: 'mapLoad', mapInstance })

        // Listen to draw mode changes
        mapInstance.on('draw.modechange', (mapEvent: DrawModeChangeEvent) =>
          dataFinderStore.send({ type: 'drawModeChange', mapEvent }),
        )

        // Listen to draw events
        mapInstance.on('draw.create', (mapEvent: DrawCreateEvent) =>
          dataFinderStore.send({ type: 'drawCreateOrUpdate', mapEvent }),
        )
        mapInstance.on('draw.update', (mapEvent: DrawCreateEvent) =>
          dataFinderStore.send({ type: 'drawCreateOrUpdate', mapEvent }),
        )

        mapInstance.on('draw.delete', () => {
          dataFinderStore.send({ type: 'drawDelete' })
        })

        // Update bounds on load
        handleMapBoundsChange()
      }}
      onMoveEnd={handleMapBoundsChange}
    >
      <NavigationControl />
      <DrawControl />
      {visibleItems.map((item) => (
        <ItemLayer key={item.id} item={item} />
      ))}
    </Maplibre>
  )
}
