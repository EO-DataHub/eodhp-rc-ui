import { BBox } from 'geojson'
import {
  LngLatBoundsLike,
  Map as MaplibreMap,
  FitBoundsOptions,
} from 'maplibre-gl'
import { areBoundsValid } from './isGeometryValid'

export const checkAndFitBounds = ({
  bounds,
  map,
  options,
}: {
  bounds: BBox
  map: MaplibreMap
  options?: FitBoundsOptions
}) => {
  const areUserAssetBoundsValid = areBoundsValid(bounds)
  if (areUserAssetBoundsValid) {
    map.fitBounds(bounds as LngLatBoundsLike, options)
  }
}
