import React, { useRef } from 'react'
import Maplibre, { IControl, MapRef, NavigationControl, useControl } from 'react-map-gl/maplibre'
import MapboxDraw from '@mapbox/mapbox-gl-draw'

import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

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

      return draw as unknown as IControl
    },
    {
      position: 'top-right',
    },
  )
  return null
}

export const Map: React.FC = () => {
  const mapRef = useRef<MapRef>(null)

  return (
    <Maplibre initialViewState={DEFAULT_MAP_VIEW} mapStyle={MAP_STYLE} ref={mapRef}>
      <NavigationControl />
      <DrawControl />
    </Maplibre>
  )
}
