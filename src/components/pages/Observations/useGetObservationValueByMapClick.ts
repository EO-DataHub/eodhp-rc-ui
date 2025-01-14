import { useContext, useEffect } from 'react'
import { useMapClickToUpdateDraggableMarker } from '../../Map/useMapClickToUpdateDraggableMarker'
import { MapRef } from '../../Map/useMap'
import axios from 'axios'
import { ObservationsPageContext } from '../../../context/ObservationsPageContext'

export const useGetObservationValueByMapclick = ({
  isMapLoaded,
  mapRef,
}: {
  isMapLoaded: boolean
  mapRef: MapRef
}) => {
  const {
    markerCoordinates,
    observationMarkerValue,
    selectedObservationLayerUrl,
    setMarkerCoordinates,
    setObservationMarkerValue,
  } = useContext(ObservationsPageContext)

  useMapClickToUpdateDraggableMarker({
    isMapLoaded,
    mapRef,
    markerCoordinates,
    setMarkerCoordinates,
  })

  useEffect(
    function setObservationValueOnMarkerCoordinateChange() {
      if (
        !markerCoordinates?.lat ||
        !markerCoordinates?.lng ||
        !selectedObservationLayerUrl ||
        !setObservationMarkerValue
      )
        return

      const queryObservationLayerByCoordinates = () => {
        const axiosController = new AbortController()

        const queryUrl = `https://titiler.xyz/cog/point/${markerCoordinates.lng},${markerCoordinates.lat}?url=${selectedObservationLayerUrl}`

        setObservationMarkerValue(null)

        axios
          .get(queryUrl, { signal: axiosController.signal })

          .then((response) => {
            const observationValue = response.data.values[0]
            setObservationMarkerValue(
              observationValue
                ? Number(observationValue).toFixed(0)
                : 'Unknown',
            )
          })
          .catch((error) => {
            if (error.code !== 'ERR_CANCELED') {
              setObservationMarkerValue('Unknown')
            }
          })

        return axiosController
      }

      const queryController = queryObservationLayerByCoordinates()

      return () => {
        queryController.abort()
      }
    },
    [markerCoordinates, selectedObservationLayerUrl, setObservationMarkerValue],
  )

  return { observationMarkerValue }
}
