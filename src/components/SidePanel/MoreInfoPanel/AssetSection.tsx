import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import type { Item } from '@/types'
import { Box, Flex, Text } from '@radix-ui/themes'
import Maplibre, { Layer, MapRef, Source } from 'react-map-gl/maplibre'
import { AssetItemTable } from './AssetItemTable'

interface AssetSectionProps {
  item: Item | null | undefined
  isLoading: boolean
  hasError: boolean
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 5,
}

export const AssetSection: React.FC<AssetSectionProps> = ({ item, isLoading, hasError }) => {
  const mapRef = useRef<MapRef>(null)
  const thumbnailUrl = item?.assets.thumbnail.href

  const bbox = useMemo(() => item?.bbox ?? [], [item?.bbox])

  const coordinates = useMemo(() => {
    if (!item) return null

    const coordinates = [
      [bbox[0], bbox[1]], // SW
      [bbox[2], bbox[1]], // SE
      [bbox[2], bbox[3]], // NE
      [bbox[0], bbox[3]], // NW
    ] as [[number, number], [number, number], [number, number], [number, number]]

    return coordinates
  }, [bbox, item])

  const showThumbnail = useCallback(() => {
    const mapInstance = mapRef.current?.getMap()
    if (!mapInstance || !item) {
      return
    }

    mapInstance.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 20, duration: 1000 },
    )
  }, [bbox, item])

  useEffect(() => {
    showThumbnail()
  }, [showThumbnail])

  if (isLoading) {
    return <Text>Loading Items...</Text>
  }

  if (hasError) {
    return <Text color="red">Error loading items!</Text>
  }

  return (
    <Flex direction="column" gap="5">
      <Box height="300px">
        <Maplibre
          initialViewState={DEFAULT_MAP_VIEW}
          mapStyle={MAP_STYLE}
          ref={mapRef}
          onLoad={() => {
            showThumbnail()
          }}
        >
          {thumbnailUrl && coordinates && (
            <Source type="image" url={thumbnailUrl} coordinates={coordinates}>
              <Layer type="raster"></Layer>
            </Source>
          )}
        </Maplibre>
      </Box>
      <AssetItemTable assets={item?.assets} />
    </Flex>
  )
}
