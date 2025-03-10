import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'

const ThumbnailItemLayer = ({ item }: { item: Item }) => {
  const thumbnailUrl = item.assets?.thumbnail?.href

  if (!thumbnailUrl) return null

  //
  const bbox = [
    [item.bbox[0], item.bbox[1]],
    [item.bbox[2], item.bbox[1]],
    [item.bbox[2], item.bbox[3]],
    [item.bbox[0], item.bbox[3]],
  ] as [[number, number], [number, number], [number, number], [number, number]]

  return (
    <Source type="image" url={thumbnailUrl} coordinates={bbox}>
      <Layer type="raster" />
    </Source>
  )
}
export default ThumbnailItemLayer
