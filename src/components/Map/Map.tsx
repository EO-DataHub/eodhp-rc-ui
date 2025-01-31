import React, { useEffect, useRef } from 'react'

import MapboxDraw from '@mapbox/mapbox-gl-draw'
import maplibregl, { LngLatLike } from 'maplibre-gl'

import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import 'maplibre-gl/dist/maplibre-gl.css'

interface DrawConstants {
  classes: {
    CONTROL_BASE: string
    CONTROL_PREFIX: string
    CONTROL_GROUP: string
  }
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  center: [-74.3227446940928, 41.05120401202896] as LngLatLike,
  zoom: 5,
}

export const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const drawInstance = useRef<MapboxDraw | null>(null)

  useEffect(() => {
    // Initialize map
    mapInstance.current = new maplibregl.Map({
      container: mapContainer.current as HTMLElement,
      style: MAP_STYLE,
      center: DEFAULT_MAP_VIEW.center,
      zoom: DEFAULT_MAP_VIEW.zoom,
    })

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

    // Add controls to maplibregl
    mapInstance.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapInstance.current.addControl(draw as unknown as maplibregl.IControl, 'top-right')

    return () => {
      mapInstance.current?.remove()
    }
  })

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}
