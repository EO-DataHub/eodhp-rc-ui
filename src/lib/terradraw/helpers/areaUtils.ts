import { calculateAoiArea } from '@/library/geoUtils'

/**
 * Calculate and notify area change for a feature
 * @param feature - GeoJSON Feature (or undefined)
 * @param callback - Optional callback to notify area change
 */
export function notifyAreaChange(
  feature: GeoJSON.Feature | undefined,
  callback?: (area: number | null) => void,
): void {
  if (feature && callback) {
    const area = calculateAoiArea(feature)
    callback(area)
  } else if (callback) {
    callback(null)
  }
}
