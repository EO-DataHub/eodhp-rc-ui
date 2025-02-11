import { useRef } from 'react'
import Maplibre, { IControl, MapRef, NavigationControl, useControl } from 'react-map-gl/maplibre'
import MapboxDraw, { DrawCreateEvent, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'

import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

import dataFinderStore, { DrawModes } from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'

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

export const Map = () => {
  const mapRef = useRef<MapRef>(null)

  const handleMapBoundsChange = () => dataFinderStore.send({ type: 'mapBoundsChange' })

  const isDrawing = useSelector(
    dataFinderStore,
    (state) => state.context.drawMode === DrawModes.DRAW_POLYGON,
  )

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
    </Maplibre>
  )
}
