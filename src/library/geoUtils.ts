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
