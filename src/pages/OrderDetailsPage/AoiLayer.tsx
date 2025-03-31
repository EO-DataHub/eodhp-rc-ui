/* eslint-disable react/prop-types */
// We're using TypeScript for prop validation, so PropTypes are not needed here.
import { Source, Layer } from 'react-map-gl/maplibre'
import type { FeatureCollection } from 'geojson'

interface AOILayerProps {
  geojson: FeatureCollection
}

export const AOILayer: React.FC<AOILayerProps> = ({ geojson }) => {
  if (!geojson?.features?.length) return null

  return (
    <Source id="aoi-source" type="geojson" data={geojson}>
      <Layer
        id="aoi-layer"
        type="fill"
        paint={{
          'fill-color': '#007AFF',
          'fill-opacity': 0.2,
        }}
      />
      <Layer
        id="aoi-line"
        type="line"
        paint={{
          'line-color': '#007AFF',
          'line-width': 2,
        }}
      />
    </Source>
  )
}
