import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import type { Item } from '@/types'
import type { SavedSet } from './demoTypes'

/** Adds a set's items to the pinned items and opens them in the Data Finder. */
export const useOpenSetOnMap = () => {
  const navigate = useNavigate()

  return (set: SavedSet, onlyItemIds?: string[]) => {
    const pinned = set.items
      .filter((i) => !onlyItemIds || onlyItemIds.includes(i.id))
      .map((i) => i.pinned)
      .filter((i): i is Item => i !== undefined)

    if (pinned.length === 0) {
      toast.info(
        `'${set.name}' is example data, so it has no real items to show. Sets you save from the map open here.`,
        { autoClose: 5000 },
      )
      return
    }

    pinned.forEach((item) => {
      if (!item.render) return
      dataFinderStore.send({
        type: 'addPinnedItem',
        item,
        collectionRender: item.render,
        isLicenseProprietary: !!item.isLicenseProprietary,
        isUserCollection: !!item.isUserCollection,
        collectionName: item.collectionName ?? item.collection,
        collection: item.collectionRef,
      })
    })
    try {
      localStorage.setItem('openPinnedItemsTab', '1')
    } catch {
      // The pinned tab just won't open automatically.
    }

    const first = pinned[0]
    const collectionId = first.collectionRef?.id ?? first.collection
    void navigate(`/finder/${first.isUserCollection ? `my-${collectionId}` : collectionId}`)
    toast.success(
      pinned.length === 1
        ? `Added ${first.id} to your pinned items`
        : `Added ${pinned.length} items from '${set.name}' to your pinned items`,
      { autoClose: 4000 },
    )
  }
}
