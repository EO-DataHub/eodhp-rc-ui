/**
 * Restore AOI from localStorage
 * @returns Parsed GeoJSON Feature or null if not found/invalid
 */
export function restoreAoiFromStorage(): GeoJSON.Feature | null {
  const storedAoi = localStorage.getItem('aoiData')
  if (!storedAoi) {
    return null
  }

  try {
    const parsedAoi = JSON.parse(storedAoi) as GeoJSON.Feature
    if (parsedAoi.geometry.type === 'Polygon' || parsedAoi.geometry.type === 'MultiPolygon') {
      return parsedAoi
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to restore AOI from localStorage:', error)
  }

  return null
}
