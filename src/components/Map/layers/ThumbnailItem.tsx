import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import * as turf from '@turf/turf'
import { Geometry } from 'geojson'

type Coordinates = [[number, number], [number, number], [number, number], [number, number]]

function normalizeCoordinates(geometry: Geometry): Coordinates {
  if (
    geometry.type !== 'Polygon' ||
    !geometry.coordinates ||
    geometry.coordinates.length === 0 ||
    geometry.coordinates[0].length < 4
  ) {
    throw new Error('Invalid geometry: Must be a Polygon with at least 4 coordinates.')
  }

  const coordinates = geometry.coordinates[0].slice(0, 4)
  const bbox = turf.bbox(geometry) // [minx, miny, maxx, maxy]
  const seCorner = turf.point([bbox[0], bbox[3]])

  let topLeftIndex = -1
  let minDistance = Infinity

  for (let i = 0; i < coordinates.length; i++) {
    const point = turf.point(coordinates[i])
    const distance = turf.distance(seCorner, point)
    if (distance < minDistance) {
      minDistance = distance
      topLeftIndex = i
    }
  }

  if (topLeftIndex === -1) {
    throw new Error('Could not find top-left corner.')
  }

  const sortedCoordinates = []
  for (let i = 0; i < coordinates.length; i++) {
    sortedCoordinates.push(coordinates[(topLeftIndex + i) % coordinates.length])
  }

  return sortedCoordinates as Coordinates
}

const ThumbnailItemLayer = ({ item }: { item: Item }) => {
  const thumbnailUrl = item.assets?.thumbnail?.href

  if (!thumbnailUrl) return null

  const coordinates = normalizeCoordinates(item.geometry)

  return (
    <Source type="image" url={thumbnailUrl} coordinates={coordinates}>
      <Layer type="raster" />
    </Source>
  )
}
export default ThumbnailItemLayer
