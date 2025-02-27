import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { collectionRenderingConfig } from '@/library/collectionRenderingConfig'

interface ItemLayerProps {
  item: Item
  showRasterTiles: boolean
  isHovered?: boolean
}

const LIST_ITEM_LINE_PAINT_STYLE = {
  'line-color': '#3a5bc7',
  'line-width': 2,
}

const HOVERED_ITEM_LINE_PAINT_STYLE = {
  'line-color': '#ff0000',
  'line-width': 6,
  'line-blur': 2,
}

const resolveTilesUrl = (item: Item): string | null => {
  const collection = item.collection
  const collectionConfig = collectionRenderingConfig[collection]

  if (!collectionConfig) return null

  const assetKey = collectionConfig.assetKey
  const assetUrl = item.assets?.[assetKey]?.href ?? null

  if (!assetUrl) return null

  return collectionConfig.tilesUrlTemplate.replace('{assetUrl}', encodeURIComponent(assetUrl))
}

const ItemLayer = ({ item, showRasterTiles, isHovered }: ItemLayerProps) => {
  const itemId = item.id
  const tilesUrl = resolveTilesUrl(item)

  return (
    <>
      {showRasterTiles && tilesUrl && (
        <Source type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
          <Layer type="raster" />
        </Source>
      )}
      <Source id={`source-${itemId}-bounds`} type="geojson" data={item.geometry}>
        <Layer
          type="line"
          paint={isHovered ? HOVERED_ITEM_LINE_PAINT_STYLE : LIST_ITEM_LINE_PAINT_STYLE}
        />
      </Source>
    </>
  )
}

export default ItemLayer
