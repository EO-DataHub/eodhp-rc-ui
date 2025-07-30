import { TerraDrawFeature } from '@/types'

// TerraDraw event interface
export interface TerraDrawEvent {
  mode?: string
}

// TerraDraw configuration
export const TERRA_DRAW_CONFIG = {
  modes: ['polygon', 'rectangle', 'delete', 'download'] as (
    | 'polygon'
    | 'rectangle'
    | 'delete'
    | 'download'
  )[],
  open: true,
  computeElevation: true,
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
