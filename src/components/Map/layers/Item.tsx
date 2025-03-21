import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { ThumbnailItemLayer } from './ThumbnailItem'
import { RasterItemLayer } from './RasterItem'
import { Item } from '@/types'

export const ItemLayer = ({ item }: { item: Item }) => {
  const render = useSelector(dataFinderStore, ({ context }) => context.collectionRender)

  if (!render) return null

  if (item.mapRender?.visible === false) return null

  if (render.thumbnail_georeference) {
    return <ThumbnailItemLayer item={item} render={render} />
  }

  return <RasterItemLayer item={item} render={render} />
}

export default ItemLayer
