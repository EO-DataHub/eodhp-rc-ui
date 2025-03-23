import { Layer, Source } from 'react-map-gl/maplibre'
import { Item, StacRender } from '@/types'
import { getAssetUrl } from '@/library/collectionRenderingConfig'
import * as turf from '@turf/turf'
import { Geometry } from 'geojson'

type Coordinates = [[number, number], [number, number], [number, number], [number, number]]

function findSkewedParallelogram(geometry: Geometry): Coordinates {
  if (geometry.type !== 'Polygon' || !geometry.coordinates || geometry.coordinates.length === 0) {
    throw new Error('Invalid geometry: Must be a Polygon.')
  }

  // Simplify the geometry if necessary
  if (geometry.coordinates[0].length > 5) {
    geometry = turf.simplify(geometry, { tolerance: 0.001, highQuality: true, mutate: true })
  }

  const coordinates = geometry.coordinates[0].slice(0, -1) // Remove the last point (duplicate of first)

  // Calculate the centroid
  const centroid = turf.centroid(geometry).geometry.coordinates

  // Find the four corners of the polygon that best represent its shape
  // We'll find the points that are farthest from the centroid in each quadrant
  const quadrants: number[][][] = [[], [], [], []]

  // Divide points into quadrants relative to the centroid
  for (const coord of coordinates) {
    const dx = coord[0] - centroid[0]
    const dy = coord[1] - centroid[1]

    if (dx >= 0 && dy >= 0)
      quadrants[0].push(coord) // Top-right
    else if (dx < 0 && dy >= 0)
      quadrants[1].push(coord) // Top-left
    else if (dx < 0 && dy < 0)
      quadrants[2].push(coord) // Bottom-left
    else quadrants[3].push(coord) // Bottom-right
  }

  // Find the point in each quadrant that is farthest from the centroid
  const corners: number[][] = []

  for (const quadrant of quadrants) {
    if (quadrant.length === 0) {
      // If a quadrant is empty, create a point in that direction
      const angle = (corners.length * Math.PI) / 2
      corners.push([centroid[0] + Math.cos(angle) * 0.01, centroid[1] + Math.sin(angle) * 0.01])
    } else {
      // Find the point farthest from the centroid
      let maxDist = 0
      let farthestPoint = quadrant[0]

      for (const point of quadrant) {
        const dist = Math.pow(point[0] - centroid[0], 2) + Math.pow(point[1] - centroid[1], 2)
        if (dist > maxDist) {
          maxDist = dist
          farthestPoint = point
        }
      }

      corners.push(farthestPoint)
    }
  }

  // Reorder corners to ensure they form a parallelogram
  // The order should be: top-right, top-left, bottom-left, bottom-right
  return corners as Coordinates
}

function normalizeCoordinates(geometry: Geometry): Coordinates {
  const parallelogram = findSkewedParallelogram(geometry)

  // Calculate the centroid of the parallelogram
  const centroid = parallelogram.reduce(
    (acc, coord) => [
      acc[0] + coord[0] / parallelogram.length,
      acc[1] + coord[1] / parallelogram.length,
    ],
    [0, 0],
  )

  // Calculate angles and sort by angle in clockwise order
  // starting from the top left corner
  const sortedCoordinates = parallelogram
    .map((coord) => ({
      coord,
      angle: Math.atan2(coord[1] - centroid[1], coord[0] - centroid[0]),
    }))
    .sort((a, b) => b.angle - a.angle) // Sort in descending order for clockwise
    .map((item) => item.coord)

  return sortedCoordinates as Coordinates
}

export const QuicklookItemLayer = ({ item, render }: { item: Item; render: StacRender }) => {
  // The quicklook asset key is configurable: render.assets can be ["quicklook"] or ["quicklook"] etc.
  const quicklookUrl = getAssetUrl(item, render.assets[0])

  if (!quicklookUrl) return null

  let coordinates: Coordinates

  if (render.quicklook_georeference === 'bbox') {
    // item.bbox is in the format [minx, miny, maxx, maxy]
    // wind the coordinates in clockwise order starting from the top left
    coordinates = [
      [item.bbox[0], item.bbox[3]],
      [item.bbox[2], item.bbox[3]],
      [item.bbox[2], item.bbox[1]],
      [item.bbox[0], item.bbox[1]],
    ] as Coordinates
  } else if (render.quicklook_georeference === 'geometry') {
    coordinates = normalizeCoordinates(item.geometry)
  } else {
    return null
  }

  const geojson = turf.polygon([
    [
      [item.bbox[0], item.bbox[1]],
      [item.bbox[2], item.bbox[1]],
      [item.bbox[2], item.bbox[3]],
      [item.bbox[0], item.bbox[3]],
      [item.bbox[0], item.bbox[1]],
    ],
  ])

  return (
    <>
      <Source type="image" url={quicklookUrl} coordinates={coordinates}>
        <Layer
          type="raster"
          paint={{
            'raster-opacity': item.mapRender?.opacity ?? 1,
          }}
        />
      </Source>
      <Source type="geojson" data={geojson}>
        <Layer type="line" paint={{ 'line-color': '#000000', 'line-width': 20 }} />
      </Source>
    </>
  )
}
