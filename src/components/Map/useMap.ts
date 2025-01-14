import Maplibregl, {
  FullscreenControl,
  LngLat,
  LngLatLike,
  Map as MaplibreMap,
  MapMouseEvent,
  NavigationControl,
  StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react'

import { MAP_MAX_ZOOM, MapSourceIds } from '../../configuration/constants'

export type MapRef = MutableRefObject<MaplibreMap | null | undefined>

const mapStyleSpec: StyleSpecification = {
  version: 8,
  name: 'Custom Style',
  glyphs:
    'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf', // this is a hack to make map fonts work (map cluster counts). Protomaps may block us at some point, and there is a ticket to have a more stable solution here https://github.com/sparkgeo/uk_eodatahub/issues/245
  sources: {
    [MapSourceIds.BASEMAP]: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: MapSourceIds.BASEMAP,
      type: 'raster',
      source: MapSourceIds.BASEMAP,
      minzoom: 0,
      maxzoom: MAP_MAX_ZOOM,
    },
  ],
}

export const useMap = (config?: {
  center?: LngLatLike
  zoom?: number
  setPersistedMapCenter?: Dispatch<SetStateAction<LngLat | undefined>>
  setPersistedMapZoom?: Dispatch<SetStateAction<number | undefined>>
}) => {
  const {
    center: initialCenter,
    zoom: initialZoom,
    setPersistedMapCenter, // if setPersistedMapCenter and setPersistedMapZoom are provided, the map will store its position in the associated state variables
    setPersistedMapZoom, // if setPersistedMapCenter and setPersistedMapZoom are provided, the map will store its position in the associated state variables
  } = config ?? {}
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreMap>()

  useEffect(
    function initializeMapInstance() {
      const isMapInitialized = !!mapRef.current
      if (isMapInitialized) return

      const center = initialCenter ?? [0, 0]
      const zoom = initialZoom ?? 1

      mapRef.current = new Maplibregl.Map({
        container: mapContainer.current as HTMLElement,
        style: mapStyleSpec,
        center: center,
        zoom: zoom,
        maxZoom: MAP_MAX_ZOOM,
      })

      mapRef.current.addControl(new NavigationControl())
      mapRef.current.addControl(new FullscreenControl())
    },
    [initialCenter, initialZoom],
  )

  useEffect(function initializeIsMapLoaded() {
    if (!mapRef.current) return

    const handleMapLoad = () => {
      setIsMapLoaded(true)
    }

    mapRef.current?.on('load', handleMapLoad)

    const mapInstance = mapRef.current

    return () => {
      mapInstance.off('load', handleMapLoad)
    }
  }, [])

  useEffect(
    function persistMapPosition() {
      if (!mapRef.current || !setPersistedMapZoom || !setPersistedMapCenter)
        return

      const handleMoveEnd = (event: MapMouseEvent) => {
        const eventMap = event.target

        const newCenter = eventMap.getCenter()
        const newZoom = eventMap.getZoom()

        setPersistedMapCenter(newCenter)
        setPersistedMapZoom(newZoom)
      }

      mapRef.current.on('moveend', handleMoveEnd)

      const mapInstance = mapRef.current
      return () => {
        mapInstance.off('moveend', handleMoveEnd)
      }
    },
    [setPersistedMapCenter, setPersistedMapZoom],
  )

  return {
    isMapLoaded,
    mapContainer,
    mapRef,
  }
}
