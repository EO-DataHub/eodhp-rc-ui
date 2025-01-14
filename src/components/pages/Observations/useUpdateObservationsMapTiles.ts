import { Dispatch, SetStateAction, useEffect } from 'react'
import {
  MapSourceIds,
  OBSERVATIONS_LAYER_INITIAL_OPACITY,
} from '../../../configuration/constants'
import { RasterTileSource } from 'maplibre-gl'
import { MapRef } from '../../Map/useMap'

export const useUpdateObservationsMapTiles = ({
  isMapLoaded,
  mapRef,
  maxTemp,
  minTemp,
  selectedObservationLayerUrl,
  setIsMapLoading,
}: {
  isMapLoaded: boolean
  mapRef: MapRef
  maxTemp: string
  minTemp: string
  selectedObservationLayerUrl: string
  setIsMapLoading: Dispatch<SetStateAction<boolean>> | undefined
}) => {
  useEffect(
    function updateObservationsMapTiles() {
      if (!isMapLoaded || !mapRef.current || !setIsMapLoading) {
        return
      }
      setIsMapLoading(true)
      void mapRef.current.once('idle', () => setIsMapLoading(false))
      const observationsSource = mapRef.current.getSource(
        MapSourceIds.OBSERVATIONS,
      ) as RasterTileSource
      const titilerUrl = `https://titiler.xyz/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${selectedObservationLayerUrl}&rescale=${minTemp},${maxTemp}&colormap_name=jet`
      if (!observationsSource) {
        mapRef.current.addSource(MapSourceIds.OBSERVATIONS, {
          type: 'raster',
          tiles: [titilerUrl],
          tileSize: 256,
        })
      }
      if (observationsSource) {
        observationsSource.setTiles([titilerUrl])
      }
      const observationsLayer = mapRef.current.getLayer(
        MapSourceIds.OBSERVATIONS,
      )
      const userAssetsLayer = mapRef.current.getLayer(MapSourceIds.USER_ASSETS)
      const layerIdToLoadObservationsBelow = userAssetsLayer
        ? userAssetsLayer.id
        : undefined
      if (!observationsLayer) {
        mapRef.current.addLayer(
          {
            id: MapSourceIds.OBSERVATIONS,
            type: 'raster',
            source: MapSourceIds.OBSERVATIONS,
            paint: { 'raster-opacity': OBSERVATIONS_LAYER_INITIAL_OPACITY },
          },
          layerIdToLoadObservationsBelow,
        )
      }
    },
    [
      isMapLoaded,
      mapRef,
      maxTemp,
      minTemp,
      selectedObservationLayerUrl,
      setIsMapLoading,
    ],
  )
}
