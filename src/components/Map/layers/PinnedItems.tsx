import { useEffect } from 'react'
import { Layer, useMap } from 'react-map-gl/maplibre'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import {
  getPinnedLayerMoves,
  pinnedLayerId,
  PINNED_LAYERS_ANCHOR_ID,
} from '@/library/pinnedLayerOrder'
import { ItemLayer } from './ItemLayer'

const PinnedItemsLayer = () => {
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)
  const { current: mapRef } = useMap()

  // MapLibre draws layers in the order they were added, not the order React renders them. Layers
  // are also added late (quicklooks load async, hidden layers remount when shown), so restack on
  // every style change as well as when the pinned order changes.
  useEffect(() => {
    const map = mapRef?.getMap()
    if (!map) return

    const desiredIds = pinnedItems.map((item) => pinnedLayerId(item.pinId ?? item.id))
    const restack = () => {
      // Not isStyleLoaded(): that stays false while any source is still loading tiles
      if (!map.style) return
      for (const [layerId, beforeId] of getPinnedLayerMoves(map.getLayersOrder(), desiredIds)) {
        map.moveLayer(layerId, beforeId)
      }
    }

    restack()
    map.on('styledata', restack)
    return () => {
      map.off('styledata', restack)
    }
  }, [mapRef, pinnedItems])

  return (
    <>
      {/* Rendered before the query and hover layers in Map.tsx, so it's added below them */}
      <Layer id={PINNED_LAYERS_ANCHOR_ID} type="background" layout={{ visibility: 'none' }} />
      {pinnedItems.map((item) => (
        <ItemLayer key={item.pinId} item={item} layerId={pinnedLayerId(item.pinId ?? item.id)} />
      ))}
    </>
  )
}

export default PinnedItemsLayer
