import { useSelector } from '@xstate/store/react'
import { QuicklookItemLayer } from './QuicklookItem'
import { RasterItemLayer } from './RasterItem'
import type { Item } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { resolveTilesUrl } from '@/library/collectionRenderingConfig'
import BoundingBoxLayer from '@/pages/OrderDetailsPage/ItemMap/BoundingBoxLayer'

export const DefaultItemLayer = ({ item }: { item: Item }) => {
  const collectionRender = useSelector(dataFinderStore, ({ context }) => context.collectionRender)
  const modifiedItem = {
    ...item,
    tilesUrl: resolveTilesUrl(item, collectionRender) ?? '',
    render: collectionRender,
    mapRender: {
      visible: true,
      opacity: 1,
    },
  }
  if (modifiedItem.mapRender?.visible === false) return null

  if (modifiedItem.render?.quicklook_georeference) {
    return (
      <>
        <BoundingBoxLayer item={modifiedItem} />
        <QuicklookItemLayer item={modifiedItem} />
      </>
    )
  }

  return (
    <>
      <BoundingBoxLayer item={modifiedItem} />
      <RasterItemLayer item={modifiedItem} />
    </>
  )
}

export default DefaultItemLayer
