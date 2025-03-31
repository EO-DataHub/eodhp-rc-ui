import React, { useCallback, useRef } from 'react'
import { Box } from '@radix-ui/themes'
import Maplibre, { MapRef } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { ItemLayer } from '@/components/Map/layers/Item'
import { AOILayer } from './AoiLayer'

interface ItemMapProps {
  item: Item
  aoiGeojson?: GeoJSON.FeatureCollection
  providerType: 'airbus_optical' | 'airbus_sar' | 'planet'
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

export const ItemMap: React.FC<ItemMapProps> = ({ item, aoiGeojson, providerType }) => {
  const mapRef = useRef<MapRef>(null)

  const showThumbnail = useCallback(() => {
    const mapInstance = mapRef.current?.getMap()
    if (!mapInstance || !item?.bbox) return

    const bbox = item.bbox
    mapInstance.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 20, duration: 0 },
    )
  }, [item])

  return (
    <Box height="300px" width="100%">
      <Maplibre
        initialViewState={DEFAULT_MAP_VIEW}
        mapStyle={MAP_STYLE}
        ref={mapRef}
        onLoad={showThumbnail}
      >
        <ItemLayer item={item} />
        {aoiGeojson && providerType !== 'airbus_sar' && <AOILayer geojson={aoiGeojson} />}
      </Maplibre>
    </Box>
  )
}
