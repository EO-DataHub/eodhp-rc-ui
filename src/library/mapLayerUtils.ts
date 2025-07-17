import { MapInstance } from 'react-map-gl/maplibre'

/**
 * Moves all TerraDraw layers to the top of the layer stack
 * @param mapInstance - The MapLibre map instance
 */
const moveTerraDrawLayersToTop = (mapInstance: MapInstance) => {
  if (!mapInstance) {
    return
  }

  const style = mapInstance.getStyle()
  if (!style) {
    return
  }

  const layers = style.layers || []

  // Find all TerraDraw layers (they start with 'td-')
  const terradrawLayers = layers.filter((layer) => layer.id.startsWith('td-'))

  // Move each TerraDraw layer to the top
  terradrawLayers.forEach((layer) => {
    try {
      mapInstance.moveLayer(layer.id)
    } catch (error) {
      // Layer might already be at the top or not exist
    }
  })
}

/**
 * Sets up comprehensive layer ordering to ensure TerraDraw layers stay on top
 * @param mapInstance - The MapLibre map instance
 * @returns Cleanup function to remove event listeners
 */
export const setupLayerOrdering = (mapInstance: MapInstance) => {
  if (!mapInstance) {
    return () => {
      // No cleanup needed when no map instance
    }
  }

  // Set up multiple event listeners to ensure layers are moved to top
  const handleStyleData = () => {
    setTimeout(() => moveTerraDrawLayersToTop(mapInstance), 100)
  }

  const handleIdle = () => {
    moveTerraDrawLayersToTop(mapInstance)
  }

  const handleData = () => {
    setTimeout(() => moveTerraDrawLayersToTop(mapInstance), 200)
  }

  // Add event listeners
  mapInstance.on('styledata', handleStyleData)
  mapInstance.on('idle', handleIdle)
  mapInstance.on('data', handleData)

  // Return cleanup function
  return () => {
    mapInstance.off('styledata', handleStyleData)
    mapInstance.off('idle', handleIdle)
    mapInstance.off('data', handleData)
  }
}
