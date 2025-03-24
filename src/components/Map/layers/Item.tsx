import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { QuicklookItemLayer } from './QuicklookItem'
import { RasterItemLayer } from './RasterItem'
import { Item } from '@/types'

export const ItemLayer = ({ item }: { item: Item }) => {
  const render = useSelector(dataFinderStore, ({ context }) => context.collectionRender)

  if (!render) return null

  if (item.mapRender?.visible === false) return null

  if (render.quicklook_georeference) {
    return <QuicklookItemLayer item={item} render={render} />
  }

  return <RasterItemLayer item={item} render={render} />
}

export default ItemLayer
