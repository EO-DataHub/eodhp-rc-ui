import { useRef } from 'react'
import Maplibre, { IControl, MapRef, NavigationControl, useControl } from 'react-map-gl/maplibre'
import MapboxDraw, { DrawCreateEvent, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'

import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

import { StacCatalogueBbox } from '@/services/ItemService'

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
        defaultMode: 'draw_polygon',
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

export const Map = ({ setMapBbox }: { setMapBbox: (bounds: StacCatalogueBbox | null) => void }) => {
  const mapRef = useRef<MapRef>(null)

  const handleMapChange = () => {
    if (mapRef.current) {
      const bounds = mapRef.current.getMap().getBounds()
      setMapBbox([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()])
    }
  }

  return (
    <Maplibre
      initialViewState={DEFAULT_MAP_VIEW}
      mapStyle={MAP_STYLE}
      ref={mapRef}
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

        // Listen to draw create events
        mapInstance.on('draw.create', (mapEvent: DrawCreateEvent) =>
          dataFinderStore.send({ type: 'drawCreate', mapEvent }),
        )

        mapInstance.on('draw.delete', () => {
          dataFinderStore.send({ type: 'drawDelete' })
        })
        handleMapChange()
      }}
      onMoveEnd={handleMapChange}
    >
      <NavigationControl />
      <DrawControl />
    </Maplibre>
  )
}
