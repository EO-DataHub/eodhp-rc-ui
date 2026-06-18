import React, { useCallback, useRef } from 'react'
import { Box } from '@radix-ui/themes'
import Maplibre, { MapRef } from 'react-map-gl/maplibre'
import { Item } from '@/types'
import { AOILayer } from './AoiLayer'
import type { LngLatLike } from 'maplibre-gl'
import DefaultItemLayer from '@/components/Map/layers/DefaultItemLayer'

interface ItemMapProps {
  item: Item
  aoiGeojson?: GeoJSON.FeatureCollection
  providerType: 'airbus_optical' | 'airbus_sar' | 'planet' | 'opencosmos'
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

export const ItemMap: React.FC<ItemMapProps> = ({ item, aoiGeojson, providerType }) => {
  const mapRef = useRef<MapRef>(null)

  // Set the initial view state based on the item's bounding box
  const initialViewState = item.bbox
    ? {
        bounds: [
          [item.bbox[0], item.bbox[1]],
          [item.bbox[2], item.bbox[3]],
        ] as [LngLatLike, LngLatLike],
        fitBoundsOptions: { padding: 20 },
      }
    : {
        latitude: DEFAULT_MAP_VIEW.latitude,
        longitude: DEFAULT_MAP_VIEW.longitude,
        zoom: DEFAULT_MAP_VIEW.zoom,
      }

  const showThumbnail = useCallback(() => {
    const mapInstance = mapRef.current?.getMap()
    if (!mapInstance || !item?.bbox) return

    mapInstance.resize()

    const bbox = item.bbox
    mapInstance.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      {
        padding: 20,
        duration: 0,
      },
    )
  }, [item])

  return (
    <Box height="300px" width="100%">
      <Maplibre
        initialViewState={initialViewState}
        mapStyle={MAP_STYLE}
        ref={mapRef}
        onLoad={showThumbnail}
      >
        <DefaultItemLayer item={item} />

        {aoiGeojson && providerType !== 'airbus_sar' && <AOILayer geojson={aoiGeojson} />}
      </Maplibre>
    </Box>
  )
}
