import { TerraDrawRectangleMode, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw'

/**
 * TerraDraw select mode configuration
 */
export const SELECT_MODE_CONFIG = {
  flags: {
    rectangle: {
      feature: {
        draggable: true,
        rotateable: false,
        scaleable: false,
        coordinates: {
          draggable: true,
          midpoints: true,
          deletable: true,
        },
      },
    },
    polygon: {
      feature: {
        draggable: true,
        rotateable: false,
        scaleable: false,
        coordinates: {
          draggable: true,
          midpoints: true,
          deletable: true,
        },
      },
    },
  },
  styles: {
    selectedPolygonColor: '#000000', // Dark color for tint
    selectedPolygonFillOpacity: 0, // No fill, only outline
    selectedPolygonOutlineColor: '#D73027',
    selectedPolygonOutlineWidth: 2,
    selectionPointColor: '#D73027',
    selectionPointOutlineColor: '#FFFFFF',
    selectionPointWidth: 6,
    selectionPointOutlineWidth: 2,
    midPointColor: '#D73027',
    midPointOutlineColor: '#FFFFFF',
    midPointWidth: 5,
    midPointOutlineWidth: 2,
  },
} as const

/**
 * TerraDraw rectangle mode configuration
 */
export const RECTANGLE_MODE_CONFIG = {
  styles: {
    fillColor: '#000000', // Dark color for tint
    outlineColor: '#D73027',
    outlineWidth: 2,
    fillOpacity: 0, // No fill, only outline
  },
} as const

/**
 * TerraDraw polygon mode configuration
 */
export const POLYGON_MODE_CONFIG = {
  styles: {
    fillColor: '#000000', // Dark color for tint
    outlineColor: '#D73027',
    outlineWidth: 2,
    fillOpacity: 0, // No fill, only outline
  },
} as const

/**
 * Create TerraDraw mode instances
 */
export function createTerraDrawModes() {
  return [
    new TerraDrawSelectMode(SELECT_MODE_CONFIG),
    new TerraDrawRectangleMode(RECTANGLE_MODE_CONFIG),
    new TerraDrawPolygonMode(POLYGON_MODE_CONFIG),
  ]
}
