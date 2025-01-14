import { BBox } from 'geojson'

export const isLatituteValid = (latitude: number) =>
  latitude >= -90 && latitude <= 90
export const isLongitudeValid = (longitude: number) =>
  longitude >= -180 && longitude <= 180

export const areBoundsValid = (bounds: BBox) => {
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] =
    bounds as Iterable<number>

  if (
    !isLatituteValid(minLatitude) ||
    !isLatituteValid(maxLatitude) ||
    !isLongitudeValid(minLongitude) ||
    !isLongitudeValid(maxLongitude)
  ) {
    return false
  }
  return true
}
