import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'

type Coordinates = [[number, number], [number, number], [number, number], [number, number]]

const ThumbnailItemLayer = ({ item }: { item: Item }) => {
  const thumbnailUrl = item.assets?.thumbnail?.href

  if (!thumbnailUrl) return null

  let coordinates: Coordinates = [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ]

  if ('coordinates' in item.geometry) {
    coordinates = (item.geometry.coordinates as number[][][])[0]
      .slice(0, 4)
      .reverse() as Coordinates
  }

  return (
    <Source type="image" url={thumbnailUrl} coordinates={coordinates}>
      <Layer type="raster" />
    </Source>
  )
}
export default ThumbnailItemLayer
