import { QuicklookItemLayer } from './QuicklookItem'
import { RasterItemLayer } from './RasterItem'
import { Item } from '@/types'

export const ItemLayer = ({ item, layerId }: { item: Item; layerId?: string }) => {
  if (item.mapRender?.visible === false) return null

  if (item.render?.quicklook_georeference) {
    return <QuicklookItemLayer item={item} layerId={layerId} />
  }

  return <RasterItemLayer item={item} layerId={layerId} />
}

export default ItemLayer
