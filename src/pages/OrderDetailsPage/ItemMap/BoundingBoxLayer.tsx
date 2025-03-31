import React from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import type { BBox } from 'geojson'

interface BoundingBoxLayerProps {
  bbox: BBox
}

export const BoundingBoxLayer: React.FC<BoundingBoxLayerProps> = ({ bbox }) => {
  const polygon = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [bbox[0], bbox[1]],
              [bbox[0], bbox[3]],
              [bbox[2], bbox[3]],
              [bbox[2], bbox[1]],
              [bbox[0], bbox[1]],
            ],
          ],
        },
        properties: {},
      },
    ],
  }

  return (
    <Source id="bbox-layer" type="geojson" data={polygon}>
      <Layer
        id="bbox-fill"
        type="fill"
        paint={{
          'fill-color': '#1E90FF',
          'fill-opacity': 0.1,
        }}
      />
      <Layer
        id="bbox-outline"
        type="line"
        paint={{
          'line-color': '#1E90FF',
          'line-width': 2,
        }}
      />
    </Source>
  )
}
