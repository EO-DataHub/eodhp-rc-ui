import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { collectionRenderingConfig } from '@/library/collectionRenderingConfig'

const LIST_ITEM_LINE_PAINT_STYLE = {
  'line-color': '#3a5bc7',
  'line-width': 2,
}

const ItemLayer = ({ item, showRasterTiles }: { item: Item; showRasterTiles: boolean }) => {
  const itemId = item.id
  const collection = item.collection

  const collectionConfig = collectionRenderingConfig[collection]
  if (!collectionConfig) return null

  const assetUrl = item.assets?.[collectionConfig.assetKey]?.href ?? null
  if (!assetUrl) return null

  const tilesUrl = collectionConfig.tilesUrlTemplate.replace(
    '{assetUrl}',
    encodeURIComponent(assetUrl),
  )

  return (
    <>
      {showRasterTiles && (
        <Source type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
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
