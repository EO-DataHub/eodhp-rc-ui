import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { ItemLayer } from './ItemLayer'

const PinnedItemsLayer = () => {
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)
  return (
    <>
      {pinnedItems.map((item) => (
        <ItemLayer key={item.pinId} item={item} />
      ))}
    </>
  )
}

export default PinnedItemsLayer
