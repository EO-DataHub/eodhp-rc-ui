import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'

const QUERY_ITEMS_LINE_PAINT_STYLE = {
  'line-color': '#3a5bc7',
  'line-width': 1,
}

const QueryItemsLayer = ({ queryItems }: { queryItems: Item[] }) => {
  return (
    <>
      {queryItems.map((item) => (
        <Source
          key={`query-item-${item.id}`}
          id={`source-${item.id}-bounds`}
          type="geojson"
          data={item.geometry}
        >
          <Layer type="line" paint={QUERY_ITEMS_LINE_PAINT_STYLE} />
        </Source>
      ))}
    </>
  )
}

export default QueryItemsLayer
