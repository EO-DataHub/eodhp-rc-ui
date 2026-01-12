// Custom styles for Mapbox Draw to replace default mapbox-gl-draw theme styles
// These styles ensure that drawn polygons preserve full edit functionality (vertex handles, midpoints, selection).

export default [
  // First dashed line that actively follows the cursor
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#D73027',
      'line-dasharray': [0.2, 2],
      'line-width': 2,
    },
  },
  // Dashed line while actively drawing the polygon
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#D73027',
      'line-dasharray': [0.2, 2],
      'line-width': 2,
    },
  },
  // Solid line once polygon is drawn and inactive (not being edited)
  {
    id: 'gl-draw-polygon-stroke-inactive',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#D73027',
      'line-width': 2,
    },
  },
  // Vertex points (corners)
  {
    id: 'gl-draw-polygon-and-line-vertex-halo-active',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
    paint: {
      'circle-radius': 10,
      'circle-color': '#FFF',
    },
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-active',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
    paint: {
      'circle-radius': 6,
      'circle-color': '#D73027',
    },
  },
  // Midpoints (for editing edges)
  {
    id: 'gl-draw-midpoint',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#D73027',
    },
  },
]
