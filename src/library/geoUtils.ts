import { area } from '@turf/turf'

export const bboxToPolygon = (bbox: number[]): GeoJSON.Geometry => ({
  type: 'Polygon',
  coordinates: [
    [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[1]],
      [bbox[2], bbox[3]],
      [bbox[0], bbox[3]],
      [bbox[0], bbox[1]],
    ],
  ],
})

/**
 * Calculate the area of a GeoJSON Feature in square kilometers
 * @param feature - GeoJSON Feature with Polygon or MultiPolygon geometry
 * @returns Area in square kilometers
 */
export function calculateAoiArea(feature: GeoJSON.Feature): number {
  try {
    const areaInSquareMeters = area(feature)
    return areaInSquareMeters / 1000000 // Convert to square kilometers
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error calculating area:', error)
    return 0
  }
}

/**
 * Validate GeoJSON Feature
 * @param feature - GeoJSON Feature to validate
 * @returns Validation result with error message if invalid
 */
export function validateGeoJSONFeature(feature: unknown): { valid: boolean; error?: string } {
  if (!feature || typeof feature !== 'object') {
    return { valid: false, error: 'Invalid GeoJSON: must be an object' }
  }

  const geoJson = feature as Record<string, unknown>

  if (geoJson.type !== 'Feature') {
    return { valid: false, error: 'Invalid GeoJSON: type must be "Feature"' }
  }

  if (!geoJson.geometry || typeof geoJson.geometry !== 'object') {
    return { valid: false, error: 'Invalid GeoJSON: missing or invalid geometry' }
  }

  const geometry = geoJson.geometry as GeoJSON.Geometry

  if (!isValidAoiGeometry(geometry)) {
    return {
      valid: false,
      error: 'Invalid geometry type: only Polygon and MultiPolygon are supported',
    }
  }

  // Validate coordinates
  if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
    return { valid: false, error: 'Invalid GeoJSON: missing or invalid coordinates' }
  }

  // Validate coordinate ranges
  const validateCoordinates = (coords: number[]): boolean => {
    if (coords.length < 2) return false
    const [lng, lat] = coords
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
  }

  const validatePolygonCoordinates = (coords: number[][][]): boolean => {
    for (const ring of coords) {
      if (ring.length < 4) return false // Minimum 4 points for closed ring
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
        return false // Ring must be closed
      }
      for (const coord of ring) {
        if (!validateCoordinates(coord)) return false
      }
    }
    return true
  }

  if (geometry.type === 'Polygon') {
    if (!validatePolygonCoordinates(geometry.coordinates as number[][][])) {
      return { valid: false, error: 'Invalid polygon coordinates' }
    }
  } else if (geometry.type === 'MultiPolygon') {
    const multiCoords = geometry.coordinates as number[][][][]
    for (const polygon of multiCoords) {
      if (!validatePolygonCoordinates(polygon)) {
        return { valid: false, error: 'Invalid MultiPolygon coordinates' }
      }
    }
  }

  return { valid: true }
}

/**
 * Validate geometry type is supported
 * @param geometry - GeoJSON Geometry
 * @returns True if geometry type is Polygon or MultiPolygon
 */
export function isValidAoiGeometry(
  geometry: GeoJSON.Geometry,
): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'
}
