import React, { useCallback, useEffect, useRef } from 'react'

import type { Item } from '@/types'
import { Box, Flex } from '@radix-ui/themes'
import Maplibre, { MapRef } from 'react-map-gl/maplibre'
import { AssetItemTable } from './AssetItemTable'
import ItemLayer from '@/components/Map/layers/Item'

interface AssetSectionProps {
  item: Item | null | undefined
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

export const AssetSection: React.FC<AssetSectionProps> = ({ item }) => {
  const mapRef = useRef<MapRef>(null)

  const showThumbnail = useCallback(() => {
    const mapInstance = mapRef.current?.getMap()
    if (!mapInstance || !item?.bbox) {
      return
    }

    const bbox = item.bbox
    mapInstance.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 20, duration: 0 },
    )
  }, [item])

  useEffect(() => {
    showThumbnail()
  }, [showThumbnail])

  return (
    <Flex direction="column" gap="6">
      <Box height="300px">
        <Maplibre
          initialViewState={DEFAULT_MAP_VIEW}
          mapStyle={MAP_STYLE}
          ref={mapRef}
          onLoad={() => {
            showThumbnail()
          }}
        >
          {item && <ItemLayer key={item.id} item={item} />}
        </Maplibre>
      </Box>
      <AssetItemTable assets={item?.assets} />
    </Flex>
  )
}
