import { useEffect, useRef, useState } from 'react'
import { useSelector } from '@xstate/store/react'
import dataFinderStore, { DrawModes } from '@/pages/DataFinderPage/useFinderStore'

import Maplibre, { IControl, MapRef, NavigationControl, useControl } from 'react-map-gl/maplibre'
import MapboxDraw, { DrawCreateEvent, DrawModeChangeEvent } from '@mapbox/mapbox-gl-draw'

import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

import PinnedItemsLayer from './layers/PinnedItems'
import QueryItemsLayer from './layers/QueryItems'
import HoveredItemLayer from './layers/HoveredItem'
import useItemsQuery from '@/hooks/useItemsQuery'

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

const MAP_STORAGE_KEY = 'mapViewState'

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
    { position: 'top-right' },
  )
  return null
}

export const Map = () => {
  const mapRef = useRef<MapRef>(null)
  const { pageItems } = useItemsQuery()

  // Load previous map state from local storage, or use default
  const savedViewState =
    JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) ?? 'null') || DEFAULT_MAP_VIEW
  const [viewState, setViewState] = useState(savedViewState)

  const handleMapBoundsChange = () => {
    if (mapRef.current) {
      const center = mapRef.current.getMap().getCenter()
      const updatedState = {
        latitude: center.lat,
        longitude: center.lng,
        zoom: mapRef.current.getMap().getZoom(),
      }

      localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(updatedState))
      setViewState(updatedState)
    }
    dataFinderStore.send({ type: 'mapBoundsChange' })
  }

  const isDrawing = useSelector(
    dataFinderStore,
    (state) => state.context.drawMode === DrawModes.DRAW_POLYGON,
  )

  // This is a workaround to move the draw layers to the top as they are added
  // on page load and should be on top of the other layers. Ideally we not need
  // to do this but there is no way to control the order of the layers in the
  // MapboxDraw control.

  // Clear the stored map extent when a session starts
  useEffect(() => {
    localStorage.removeItem(MAP_STORAGE_KEY)
  }, [])

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
  }, [mapInstance, pageItems])

  return (
    <Maplibre
      initialViewState={viewState}
      mapStyle={MAP_STYLE}
      ref={mapRef}
      cursor={isDrawing ? 'crosshair' : 'grab'}
      onMoveEnd={handleMapBoundsChange}
      onLoad={() => {
        const mapInstance = mapRef.current?.getMap()
        // Send the map instance to the store
        if (!mapInstance) return

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
    >
      <NavigationControl />
      <DrawControl />
      <PinnedItemsLayer />
      <QueryItemsLayer queryItems={pageItems} />
      <HoveredItemLayer />
    </Maplibre>
  )
}
