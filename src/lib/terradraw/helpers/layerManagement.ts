import maplibregl from 'maplibre-gl'

/**
 * Move TerraDraw layers to the top of the layer stack
 * @param map - MapLibre GL map instance
 */
export function moveTerraDrawLayersToTop(map: maplibregl.Map): void {
  try {
    const style = map.getStyle()
    if (!style?.layers) return

    // TerraDraw layers typically have IDs starting with "terra-draw-"
    // or contain "terra-draw" in their ID, or start with "td-"
    const terraDrawLayerIds: string[] = []

    // Collect all layer IDs and identify TerraDraw layers
    for (const layer of style.layers) {
      if (layer.id.includes('terra-draw') || layer.id.startsWith('td-')) {
        terraDrawLayerIds.push(layer.id)
      }
    }

    // Move each TerraDraw layer to the top
    // We move them in reverse order to maintain their relative order
    for (let i = terraDrawLayerIds.length - 1; i >= 0; i--) {
      const layerId = terraDrawLayerIds[i]
      try {
        // Move to the top (before undefined means move to top)
        map.moveLayer(layerId)
      } catch (error) {
        // Layer might not exist yet or already be at top
        // eslint-disable-next-line no-console
        console.debug('Could not move TerraDraw layer:', layerId, error)
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Error moving TerraDraw layers to top:', error)
  }
}
