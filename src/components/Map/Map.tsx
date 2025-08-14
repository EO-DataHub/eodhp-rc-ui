import { useEffect, useRef, useState } from 'react'
import { useSelector } from '@xstate/store/react'
import { useItemsQuery } from '@/hooks/useItemsQuery'
import Maplibre, { MapRef, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import PinnedItemsLayer from './layers/PinnedItems'
import QueryItemsLayer from './layers/QueryItems'
import HoveredItemLayer from './layers/HoveredItem'
import { RestoreAOIDialog } from './RestoreAOIDialog'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { setupLayerOrdering } from '@/library/mapLayerUtils'
import { useTerraDraw } from '@/hooks/useTerraDraw'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

const MAP_STORAGE_KEY = 'mapViewState'

export const Map = () => {
  const mapRef = useRef<MapRef>(null)
  const { pageItems } = useItemsQuery()

  // Load previous map state from local storage, or use default
  const savedViewState =
    JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) ?? 'null') || DEFAULT_MAP_VIEW
  const [viewState, setViewState] = useState(savedViewState)

  const mapInstance = useSelector(dataFinderStore, (state) => state.context.mapInstance)

  // Initialize TerraDraw
  useTerraDraw(mapInstance)

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

  useEffect(() => {
    if (!mapInstance) return

    const cleanup = setupLayerOrdering(mapInstance)
    return cleanup
  }, [mapInstance])

  const handleMapLoad = () => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // Send the map instance to the store
    dataFinderStore.send({ type: 'mapLoad', mapInstance: map })
    handleMapBoundsChange()
  }

  return (
    <>
      <Maplibre
        initialViewState={viewState}
        mapStyle={MAP_STYLE}
        ref={mapRef}
        onMoveEnd={handleMapBoundsChange}
        onLoad={handleMapLoad}
      >
        <NavigationControl />
        <PinnedItemsLayer />
        <QueryItemsLayer queryItems={pageItems} />
        <HoveredItemLayer />
      </Maplibre>
      <RestoreAOIDialog />
    </>
  )
}
