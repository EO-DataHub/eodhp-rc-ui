import { useRef, useState, useEffect } from 'react'
import Maplibre, {
  IControl,
  MapRef,
  NavigationControl,
  useControl,
  Source,
  Layer,
} from 'react-map-gl/maplibre'
import MapboxDraw from '@mapbox/mapbox-gl-draw'

import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { StacCatalogueBbox } from '@/services/ItemService'
import { Item } from '@/types'

const TITILER_URL = import.meta.env.VITE_TITILER_BASE_URL

interface DrawConstants {
  classes: {
    CONTROL_BASE: string
    CONTROL_PREFIX: string
    CONTROL_GROUP: string
  }
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_MAP_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
}

function DrawControl() {
  const drawInstance = useRef<MapboxDraw | null>(null)

  useControl(
    () => {
      const mapboxDrawConstants = MapboxDraw.constants as unknown as DrawConstants
      mapboxDrawConstants.classes.CONTROL_BASE = 'maplibregl-ctrl'
      mapboxDrawConstants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-'
      mapboxDrawConstants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group'

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: 'draw_polygon',
      })
      drawInstance.current = draw

      return draw as unknown as IControl
    },
    {
      position: 'top-right',
    },
  )
  return null
}

interface MapProps {
  setMapBbox: (bounds: StacCatalogueBbox | null) => void
  currentItem: Item | null
}

export const Map = ({ setMapBbox, currentItem }: MapProps) => {
  const mapRef = useRef<MapRef>(null)
  const [tilerUrl, setTilerUrl] = useState<string | null>(null)

  const handleMapChange = () => {
    if (mapRef.current) {
      const bounds = mapRef.current.getMap().getBounds()
      setMapBbox([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()])
    }
  }

  useEffect(() => {
    if (currentItem) {
      setTilerUrl(
        `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url=${currentItem?.assets.cog.href}&bidx=1&bidx=2&bidx=3&rescale=0,1000`,
      )

      mapRef.current?.fitBounds(
        [currentItem.bbox[0], currentItem.bbox[1], currentItem.bbox[2], currentItem.bbox[3]],
        {
          padding: 100,
        },
      )
    }
  }, [currentItem])

  return (
    <Maplibre
      initialViewState={DEFAULT_MAP_VIEW}
      mapStyle={MAP_STYLE}
      ref={mapRef}
      onLoad={handleMapChange}
      onMoveEnd={handleMapChange}
    >
      <NavigationControl />
      <DrawControl />
      {tilerUrl && (
        <Source type="raster" tileSize={256} tiles={[tilerUrl]}>
          <Layer type="raster" />
        </Source>
      )}
    </Maplibre>
  )
}
