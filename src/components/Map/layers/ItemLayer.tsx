import { QuicklookItemLayer } from './QuicklookItem'
import { RasterItemLayer } from './RasterItem'
import { Item } from '@/types'

export const ItemLayer = ({ item }: { item: Item }) => {
  if (item.mapRender?.visible === false) return null

  if (item.render?.quicklook_georeference) {
    return <QuicklookItemLayer item={item} />
  }

  return <RasterItemLayer item={item} />
}

export default ItemLayer
