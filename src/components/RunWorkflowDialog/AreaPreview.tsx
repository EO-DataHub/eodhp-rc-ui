import React, { useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { calculateAoiArea } from '@/library/geoUtils'
import styles from './RunWorkflowDialog.module.scss'

const THUMBNAIL_SIZE = 64
const PADDING = 4

type Ring = number[][]

const ringsOf = (geometry: GeoJSON.Geometry | null | undefined): Ring[] => {
  if (!geometry) return []
  switch (geometry.type) {
    case 'Polygon':
      return geometry.coordinates
    case 'MultiPolygon':
      return geometry.coordinates.flat()
    default:
      return []
  }
}

/** SVG paths for the area's rings, scaled to fit the thumbnail. */
const outlinePaths = (feature: GeoJSON.Feature): string[] => {
  const rings = ringsOf(feature.geometry).filter((ring) => ring.length > 0)
  const points = rings.flat()
  if (points.length === 0) return []

  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  // Shrink longitude by the latitude, so the outline keeps roughly its shape on the map
  const midLat = ((minY + maxY) / 2) * (Math.PI / 180)
  const xScale = Math.max(Math.cos(midLat), 0.01)
  const width = (maxX - minX) * xScale || 1e-9
  const height = maxY - minY || 1e-9
  const inner = THUMBNAIL_SIZE - PADDING * 2
  const scale = inner / Math.max(width, height)
  const offsetX = PADDING + (inner - width * scale) / 2
  const offsetY = PADDING + (inner - height * scale) / 2

  return rings.map(
    (ring) =>
      ring
        .map(([x, y], index) => {
          const px = offsetX + (x - minX) * xScale * scale
          const py = offsetY + (maxY - y) * scale
          return `${index === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`
        })
        .join(' ') + ' Z',
  )
}

/** The area's size in km², or in hectares below 1 km². */
const formatAreaSize = (squareKm: number): string => {
  if (squareKm < 1) {
    const hectares = squareKm * 100
    return `${hectares.toLocaleString('en-GB', { maximumFractionDigits: hectares < 10 ? 1 : 0 })} ha`
  }
  return `${squareKm.toLocaleString('en-GB', { maximumFractionDigits: squareKm < 100 ? 1 : 0 })} km²`
}

/** An outline thumbnail of a drawn area, with its size. */
export const AreaPreview: React.FC<{ area: GeoJSON.Feature }> = ({ area }) => {
  const paths = useMemo(() => outlinePaths(area), [area])
  const size = useMemo(() => formatAreaSize(calculateAoiArea(area)), [area])

  return (
    <Flex gap="3" align="center">
      <svg
        role="img"
        aria-label="Outline of the drawn area"
        className={styles.areaThumbnail}
        width={THUMBNAIL_SIZE}
        height={THUMBNAIL_SIZE}
        viewBox={`0 0 ${THUMBNAIL_SIZE} ${THUMBNAIL_SIZE}`}
      >
        {paths.map((d, index) => (
          <path key={index} d={d} fillRule="evenodd" />
        ))}
      </svg>
      <Text size="2" color="gray">
        {size}
      </Text>
    </Flex>
  )
}
