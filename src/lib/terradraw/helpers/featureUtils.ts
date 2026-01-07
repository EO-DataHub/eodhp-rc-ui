import { TerraDraw } from 'terra-draw'
import { isValidAoiGeometry } from '@/library/geoUtils'

/**
 * Verify if a feature exists in TerraDraw's snapshot
 * @param terraDraw - TerraDraw instance
 * @param id - Feature ID to verify
 * @returns True if feature exists
 */
export function verifyFeatureExists(terraDraw: TerraDraw, id: string | number): boolean {
  try {
    const snapshot = terraDraw.getSnapshot()
    return snapshot.some((f) => f.id === id)
  } catch {
    return false
  }
}

/**
 * Get all existing feature IDs from TerraDraw snapshot
 * @param terraDraw - TerraDraw instance
 * @returns Array of feature IDs
 */
export function getExistingFeatureIds(terraDraw: TerraDraw): (string | number)[] {
  try {
    const snapshot = terraDraw.getSnapshot()
    return snapshot.map((f) => f.id).filter((id): id is string | number => id !== undefined)
  } catch {
    return []
  }
}

/**
 * Validate if a feature has valid AOI geometry (Polygon or MultiPolygon)
 * @param feature - GeoJSON Feature to validate
 * @returns True if feature has valid AOI geometry
 */
export function isValidAoiFeature(feature: GeoJSON.Feature): boolean {
  return isValidAoiGeometry(feature.geometry)
}
