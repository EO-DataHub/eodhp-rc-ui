export const getIsFileCsv = (file: File): boolean => file.type === 'text/csv'
export const getIsFileGeoJson = (file: File): boolean =>
  file.name.split('.').pop() === 'geojson' // dropzone.js doesnt provide a type for geojson, so the utility uses the extension instead
