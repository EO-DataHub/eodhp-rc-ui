import { Layer, Source } from 'react-map-gl/maplibre'

import { Item } from '@/types'

const TITILER_URL = import.meta.env.VITE_TITILER_BASE_URL

const LIST_ITEM_LINE_PAINT_STYLE = {
  'line-color': '#3a5bc7',
  'line-width': 2,
}

const ItemLayer = ({ item }: { item: Item }) => {
  const itemId = item.id
  const cogUrl = item.assets?.cog?.href ?? null
  const tilesUrl = `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url=${cogUrl}&bidx=1&bidx=2&bidx=3&rescale=0,1000`
  return (
    <>
      {cogUrl && (
        <Source type="raster" tileSize={256} tiles={[tilesUrl]}>
          <Layer type="raster" />
        </Source>
      )}
      <Source id={`source-${itemId}-bounds`} type="geojson" data={item.geometry}>
        <Layer type="line" paint={LIST_ITEM_LINE_PAINT_STYLE} />
      </Source>
    </>
  )
}

export default ItemLayer
