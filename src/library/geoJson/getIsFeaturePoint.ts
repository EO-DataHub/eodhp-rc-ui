import { Feature } from 'geojson'

export const getIsFeaturePoint = (feature: Feature) =>
  feature.geometry.type === 'Point'
