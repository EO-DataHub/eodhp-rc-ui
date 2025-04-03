import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { resolveTilesUrl } from '@/library/collectionRenderingConfig'

export const RasterItemLayer = ({ item }: { item: Item }) => {
  // When on assets tab, resolve the tiles url when rendering
  const tilesUrl = item.tilesUrl ?? resolveTilesUrl(item, item.render)

  if (!tilesUrl) return null

  return (
    <Source type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
      <Layer
        type="raster"
        paint={{
          'raster-opacity': item.mapRender?.opacity ?? 1,
        }}
      />
    </Source>
  )
}
