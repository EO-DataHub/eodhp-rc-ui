import { Layer, Source } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { resolveTilesUrl } from '@/library/collectionRenderingConfig'

const RasterItemLayer = ({ item }: { item: Item }) => {
  const collection = useSelector(dataFinderStore, (state) => state.context.collection)

  const tilesUrl = item.tilesUrl ?? resolveTilesUrl(item, collection)

  if (!tilesUrl) return null

  return (
    <Source type="raster" tileSize={256} tiles={[tilesUrl]} bounds={item.bbox}>
      <Layer type="raster" />
    </Source>
  )
}

export default RasterItemLayer
