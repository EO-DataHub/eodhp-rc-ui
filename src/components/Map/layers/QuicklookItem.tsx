import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { getAssetUrl } from '@/library/collectionRenderingConfig'
import simplify from '@turf/simplify'
import centroid from '@turf/centroid'
import { Geometry } from 'geojson'
import proj4 from 'proj4'
import { useEffect, useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useQuery } from '@tanstack/react-query'
import { fetchQuicklookImage } from '../../../library/fetchQuicklookImage'

type Coordinates = [[number, number], [number, number], [number, number], [number, number]]

function findSkewedParallelogram(geometry: Geometry): Coordinates {
  if (geometry.type !== 'Polygon' || !geometry.coordinates || geometry.coordinates.length === 0) {
    throw new Error('Invalid geometry: Must be a Polygon.')
  }

  // Simplify the geometry if necessary
  if (geometry.coordinates[0].length > 5) {
    geometry = simplify(geometry, { tolerance: 0.001, highQuality: true, mutate: true })
  }

  const coordinates = geometry.coordinates[0].slice(0, -1) // Remove the last point (duplicate of first)

  // Calculate the centroid
  const centroidResult = centroid(geometry).geometry.coordinates

  // Find the four corners of the polygon that best represent its shape
  // We'll find the points that are farthest from the centroid in each quadrant
  const quadrants: number[][][] = [[], [], [], []]

  // Divide points into quadrants relative to the centroid
  for (const coord of coordinates) {
    const dx = coord[0] - centroidResult[0]
    const dy = coord[1] - centroidResult[1]

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
      corners.push([
        centroidResult[0] + Math.cos(angle) * 0.01,
        centroidResult[1] + Math.sin(angle) * 0.01,
      ])
    } else {
      // Find the point farthest from the centroid
      let maxDist = 0
      let farthestPoint = quadrant[0]

      for (const point of quadrant) {
        const dist =
          Math.pow(point[0] - centroidResult[0], 2) + Math.pow(point[1] - centroidResult[1], 2)
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

/**
 * Transforms a geographic bounding box to a local UTM zone, makes it square, and transforms back to geographic coordinates.
 *
 * @param {number[]} bbox - The geographic bounding box [minlon, minlat, maxlon, maxlat].
 * @returns {number[]} - The transformed and squared geographic bounding box [minlon, minlat, maxlon, maxlat].
 */
function squareAndTransformBoundingBox(bbox: number[]): number[] {
  if (bbox.length !== 4) {
    throw new Error('Bounding box must have 4 elements: [minlon, minlat, maxlon, maxlat]')
  }

  const [minlon, minlat, maxlon, maxlat] = bbox

  // Calculate the center of the bounding box.
  const centerlon = (minlon + maxlon) / 2

  // Determine the UTM zone based on the center longitude.
  const utmZone = Math.floor((centerlon + 180) / 6) + 1
  const utmProjection = `+proj=utm +zone=${utmZone} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`
  const wgs84Projection = 'EPSG:4326'

  // Transform the bounding box to UTM coordinates.
  const utmMin = proj4(wgs84Projection, utmProjection, [minlon, minlat])
  const utmMax = proj4(wgs84Projection, utmProjection, [maxlon, maxlat])

  // Calculate the width and height of the bounding box in UTM coordinates.
  const width = utmMax[0] - utmMin[0]
  const height = utmMax[1] - utmMin[1]

  // Calculate the side length of the square bounding box.
  const sideLength = Math.max(width, height)

  // Calculate the new UTM coordinates for the square bounding box.
  const utmMinSquare: number[] = [
    utmMin[0] - (sideLength - width) / 2,
    utmMin[1] - (sideLength - height) / 2,
  ]
  const utmMaxSquare: number[] = [utmMinSquare[0] + sideLength, utmMinSquare[1] + sideLength]

  // Transform the square bounding box back to geographic coordinates.
  const geoMinSquare = proj4(utmProjection, wgs84Projection, utmMinSquare)
  const geoMaxSquare = proj4(utmProjection, wgs84Projection, utmMaxSquare)

  // Return the squared geographic bounding box.
  return [geoMinSquare[0], geoMinSquare[1], geoMaxSquare[0], geoMaxSquare[1]]
}

export const QuicklookItemLayer = ({ item }: { item: Item }) => {
  const { render } = item
  const { token } = useContext(AuthenticationContext)

  // The quicklook asset key is configurable: render.assets can be ["quicklook"] or ["quicklook"] etc.
  const quicklookUrl = render ? getAssetUrl(item, render.assets[0]) : undefined

  const { data: imageUrl } = useQuery<string | undefined>({
    queryKey: ['quicklook', quicklookUrl, token],
    queryFn: () =>
      quicklookUrl
        ? fetchQuicklookImage({ url: quicklookUrl, token: render?.auth ? token : undefined })
        : Promise.resolve(undefined),
    enabled: !!(render && quicklookUrl && (!render.auth || token)),
  })

  // Revoke object URL when imageUrl changes or component unmounts
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  // Early return if not a quicklook item or no imageUrl
  if (!render?.quicklook_georeference) return null
  if (typeof imageUrl !== 'string') return null

  let coordinates: Coordinates

  if (render.quicklook_georeference === 'bbox') {
    coordinates = [
      [item.bbox[0], item.bbox[3]],
      [item.bbox[2], item.bbox[3]],
      [item.bbox[2], item.bbox[1]],
      [item.bbox[0], item.bbox[1]],
    ] as Coordinates
  } else if (render.quicklook_georeference === 'bbox-squared') {
    const bbox = squareAndTransformBoundingBox(item.bbox)
    coordinates = [
      [bbox[0], bbox[3]],
      [bbox[2], bbox[3]],
      [bbox[2], bbox[1]],
      [bbox[0], bbox[1]],
    ] as Coordinates
  } else if (render.quicklook_georeference === 'geometry') {
    coordinates = normalizeCoordinates(item.geometry)
  } else {
    return null
  }

  return (
    <>
      <Source type="image" url={imageUrl} coordinates={coordinates}>
        <Layer
          type="raster"
          paint={{
            'raster-opacity': item.mapRender?.opacity ?? 1,
          }}
        />
      </Source>
    </>
  )
}
