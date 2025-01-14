import { LngLat, MapMouseEvent, Marker } from 'maplibre-gl'
import { useEffect, useRef, Dispatch, SetStateAction } from 'react'
import { MapRef } from './useMap'

export const useMapClickToUpdateDraggableMarker = ({
  isMapLoaded,
  mapRef,
  markerCoordinates,
  setMarkerCoordinates,
}: {
  isMapLoaded: boolean
  mapRef: MapRef
  markerCoordinates: LngLat | undefined
  setMarkerCoordinates?: Dispatch<SetStateAction<LngLat | undefined>>
}) => {
  const marker = useRef(new Marker({ draggable: true, color: '#3e63dd' }))

  useEffect(
    function addMarkerToMapIfPersistedCoordinates() {
      if (!isMapLoaded || !mapRef.current || !markerCoordinates) return
      if (!marker.current.getLngLat()) {
        marker.current.setLngLat(markerCoordinates)
        marker.current.addTo(mapRef.current)
      }
    },
    [isMapLoaded, mapRef, markerCoordinates],
  )

  useEffect(
    function initializeMarkerAndClicking() {
      if (!isMapLoaded || !mapRef.current || !marker.current) return

      const handleMapClick = (event: MapMouseEvent) => {
        const { lngLat } = event
        setMarkerCoordinates?.(lngLat)
        marker.current.setLngLat(lngLat)
        marker.current.addTo(mapRef.current!)
      }

      const handleMarkerDragEnd = () => {
        setMarkerCoordinates?.(marker.current.getLngLat())
      }

      mapRef.current.on('click', handleMapClick)
      marker.current.on('dragend', handleMarkerDragEnd)

      const currentMapRef = mapRef.current
      const currentMarker = marker.current

      return () => {
        currentMapRef?.off('click', handleMapClick)
        currentMarker.off('dragend', handleMarkerDragEnd)
      }
    },
    [isMapLoaded, mapRef, setMarkerCoordinates],
  )
}
