import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { resolveTilesUrl } from '@/library/collectionRenderingConfig'

const RasterItemLayer = ({ item }: { item: Item }) => {
  const tilesUrl = item.tilesUrl ?? resolveTilesUrl(item)

  if (!tilesUrl) return null

  return (
    <Source type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
      <Layer type="raster" />
    </Source>
  )
}

export default RasterItemLayer
