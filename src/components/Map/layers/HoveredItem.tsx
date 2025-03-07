import { Layer, Source } from 'react-map-gl/maplibre'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'

const HOVERED_ITEM_LINE_PAINT_STYLE = {
  'line-color': 'rgba(25, 118, 210, 0.4)',
  'line-width': 6,
  'line-blur': 3,
}

const HoveredItemLayer = () => {
  const item = useSelector(dataFinderStore, (state) => state.context.hoveredItem)

  if (!item) return null

  return (
    <Source
      key={`hovered-item-${item.id}`}
      id={`hovered-item-${item.id}-bounds`}
      type="geojson"
      data={item.geometry}
    >
      <Layer type="line" paint={HOVERED_ITEM_LINE_PAINT_STYLE} />
    </Source>
  )
}

export default HoveredItemLayer
