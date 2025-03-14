import React, { useCallback, useEffect, useRef } from 'react'

import type { Item } from '@/types'
import { Box, Flex, Text } from '@radix-ui/themes'
import Maplibre, { MapRef } from 'react-map-gl/maplibre'
import { AssetItemTable } from './AssetItemTable'
import RasterItemLayer from '@/components/Map/layers/RasterItem'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'

interface AssetSectionProps {
  item: Item | null | undefined
  isLoading: boolean
  hasError: boolean
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

export const AssetSection: React.FC<AssetSectionProps> = ({ item, isLoading, hasError }) => {
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

  if (isLoading) {
    return (
      <Flex gap="3" align="center">
        <LoadingIndicator size="3" />
        <Text>Loading data...</Text>
      </Flex>
    )
  }

  if (hasError) {
    return <Text color="red">Error loading items!</Text>
  }

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
          {item && <RasterItemLayer key={item.id} item={item} />}
        </Maplibre>
      </Box>
      <AssetItemTable assets={item?.assets} />
    </Flex>
  )
}
