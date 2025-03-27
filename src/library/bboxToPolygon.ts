export const bboxToPolygon = (bbox: number[]): number[][][] => {
  const [minX, minY, maxX, maxY] = bbox

  if (bbox.length !== 4) {
    throw new Error('Invalid bbox: must contain exactly 4 numbers [minX, minY, maxX, maxY]')
  }

  return [
    [
      [minX, minY],
      [minX, maxY],
      [maxX, maxY],
      [maxX, minY],
      [minX, minY],
    ],
  ]
}
