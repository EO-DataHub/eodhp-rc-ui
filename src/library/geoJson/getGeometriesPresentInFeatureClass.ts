import { FeatureCollection } from 'geojson'

export const getGeometriesPresentInFeatureCollection = (
  FeatureCollection: FeatureCollection,
) => {
  const geometries = FeatureCollection.features.map(
    (feature) => feature.geometry.type,
  )

  return Array.from(new Set(geometries))
}
