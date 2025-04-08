import type { Item } from '@/types'
import { Source, Layer } from 'react-map-gl/maplibre'

const QUERY_ITEMS_LINE_PAINT_STYLE = {
  'line-color': '#3a5bc7',
  'line-width': 1,
}

const BoundingBoxLayer = ({ item }: { item: Item }) => {
  return (
    <>
      <Source
        key={`query-item-${item.id}`}
        id={`source-${item.id}-bounds`}
        type="geojson"
        data={item.geometry}
      >
        <Layer type="line" paint={QUERY_ITEMS_LINE_PAINT_STYLE} />
      </Source>
    </>
  )
}

export default BoundingBoxLayer
