import { TerraDrawFeature } from '@/types'
import { MapInstance } from 'react-map-gl/maplibre'

// TerraDraw event interface
export interface TerraDrawEvent {
  mode?: string
}

// TerraDraw configuration
export const TERRA_DRAW_CONFIG = {
  modes: ['polygon', 'rectangle', 'select', 'delete', 'download'] as (
    | 'polygon'
    | 'rectangle'
    | 'select'
    | 'delete'
    | 'download'
  )[],
  open: true,
}

// TerraDraw instance interface based on the actual methods available
export interface TerraDrawInstance {
  getSnapshot(): TerraDrawFeature[] | undefined
  addFeatures(features: GeoJSON.Feature[]): void
  clear(): void
  on(event: string, callback: (data?: unknown) => void): void
  enabled: boolean
  start(): void
  stop(): void
}

// Helper function to remove area label layers created by MaplibreMeasureControl
export const removeAreaLabelLayers = (mapInstance: MapInstance) => {
  try {
    const style = mapInstance.getStyle()
    if (!style?.layers) return

    // Remove the specific area label layer
    const areaLabelLayerId = 'terradraw-measure-polygon-label'
    if (mapInstance.getLayer(areaLabelLayerId)) {
      mapInstance.removeLayer(areaLabelLayerId)
    }

    // Also remove the associated source if it exists
    const areaLabelSourceId = 'terradraw-measure-polygon-source'
    if (mapInstance.getSource(areaLabelSourceId)) {
      mapInstance.removeSource(areaLabelSourceId)
    }
  } catch (error) {
    // Silently handle any errors during cleanup to avoid breaking functionality
    // Error is intentionally ignored to prevent breaking existing functionality
  }
}

// Helper function to create AOI feature from TerraDraw feature
export const createAOIFeature = (feature: TerraDrawFeature): GeoJSON.Feature => {
  return {
    type: 'Feature',
    geometry: feature.geometry as GeoJSON.Geometry,
    properties: feature.properties ?? {},
    id: feature.id ?? `aoi-${Date.now()}`,
  }
}

// Helper function to check if feature is a valid polygon
export const isValidPolygonFeature = (feature: TerraDrawFeature): boolean => {
  return feature?.geometry && feature.geometry.type === 'Polygon'
}
