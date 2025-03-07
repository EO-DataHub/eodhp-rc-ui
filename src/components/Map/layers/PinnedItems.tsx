import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import RasterItemLayer from './RasterItem'

const PinnedItemsLayer = () => {
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)
  return (
    <>
      {pinnedItems.map((item) => (
        <RasterItemLayer key={`pinned-item-${item.id}`} item={item} />
      ))}
    </>
  )
}

export default PinnedItemsLayer
