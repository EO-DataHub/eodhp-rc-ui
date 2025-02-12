import React, { useCallback, useEffect, useRef } from 'react'

import type { Item } from '@/types'
import { Box, Flex, Text } from '@radix-ui/themes'
import Maplibre, { MapRef } from 'react-map-gl/maplibre'
import { AssetItemTable } from './AssetItemTable'
import { Polygon } from 'geojson'
import { Feature } from 'maplibre-gl'

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

  const showThumbnail = useCallback(() => {
    const mapInstance = mapRef.current?.getMap()
    if (!mapInstance || !item) {
      return
    }

    if (mapInstance.getLayer('stac-thumbnail-layer')) {
      mapInstance.removeLayer('stac-thumbnail-layer')
    }

    if (mapInstance.getSource('stac-thumbnail')) {
      mapInstance.removeSource('stac-thumbnail')
    }

    const bbox = item.bbox

    // Define image corners (SW, SE, NE, NW)
    // const coordinates = [
    //   [bbox[0], bbox[1]], // SW
    //   [bbox[2], bbox[1]], // SE
    //   [bbox[2], bbox[3]], // NE
    //   [bbox[0], bbox[3]], // NW
    // ] as [[number, number], [number, number], [number, number], [number, number]]

    // const thumbnailUrl = item.assets.thumbnail.href

    mapInstance.addSource('stac-thumbnail', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: "Polygon",
          coordinates: item.geometry.coordinates
        },
        properties: item.properties
      },
    })

    mapInstance.addLayer({
      id: 'stac-thumbnail-layer',
      type: "line",
      source: 'stac-thumbnail',
      paint: {
        "line-color": "#000000",
        "line-width": 2
      },
    })

    mapInstance.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 20, duration: 0 },
    )
  }, [item])

  useEffect(() => {
    const mapInstance = mapRef.current?.getMap()
    if (!mapInstance) {
      return
    }
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
        ></Maplibre>
      </Box>
      <AssetItemTable assets={item?.assets} />
    </Flex>
  )
}
