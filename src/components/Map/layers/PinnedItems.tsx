import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { ItemLayer } from './Item'

const PinnedItemsLayer = () => {
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)
  return (
    <>
      {pinnedItems.map((item) => (
        <ItemLayer key={`pinned-item-${item.id}`} item={item} />
      ))}
    </>
  )
}

export default PinnedItemsLayer
