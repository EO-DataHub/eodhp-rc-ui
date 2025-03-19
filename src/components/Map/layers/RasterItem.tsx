import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { resolveTilesUrl } from '@/library/collectionRenderingConfig'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import ThumbnailItemLayer from './ThumbnailItem'

const RasterItemLayer = ({ item }: { item: Item }) => {
  const collectionRender = useSelector(dataFinderStore, ({ context }) => context.collectionRender)

  if (!collectionRender) return null

  if (collectionRender.missing_georeference) {
    return <ThumbnailItemLayer item={item} />
  }

  // When on assets tab, resolve the tiles url when rendering
  const tilesUrl = item.tilesUrl ?? resolveTilesUrl(item, collectionRender)

  if (!tilesUrl) return null

  return (
    <Source type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
      <Layer type="raster" />
    </Source>
  )
}

export default RasterItemLayer
