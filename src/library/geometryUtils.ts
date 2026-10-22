import { centerOfMass, distance, area, bboxPolygon, pointToPolygonDistance } from '@turf/turf'
import { convertArea, point, feature } from '@turf/helpers'
import { Item } from '@/types.ts'
import { MapBounds } from '@/pages/DataFinderPage/useFinderStore.ts'
import { Feature } from 'geojson'

interface SortFeatureOptions {
  distanceBias: number
  areaBias: number
  aspectBias: number
  temporalBias: number
}

export function sortFeatures(
  mapBounds: MapBounds | undefined,
  aoi: Feature | undefined,
  items: Item[],
  options: SortFeatureOptions = {
    distanceBias: 1.0,
    areaBias: 1.0,
    aspectBias: 1.0,
    temporalBias: 1.0,
  },
): Item[] {
  let center = point([0.0, 0.0])

  if (aoi) {
    center = centerOfMass(aoi)
  } else if (mapBounds) {
    center = centerOfMass(bboxPolygon(mapBounds))
  }

  return items
    .map((item: Item) => {
      // Initialise and reset the feature's score.
      let score = 0.0
      const feat = feature(item.geometry, item.properties, { bbox: item.bbox, id: item.id })

      // A reciprocal distance weighting, favouring centers of mass closer to the provided point.
      // const com = centerOfMass(item.geometry)
      // const dist = Math.max(1.0, distance(center, com, { units: 'kilometers' }))
      // A reciprocal distance weighting, favouring features closer to the provided point.
      const dist = Math.max(
        1.0,
        // @ts-expect-error feat is a generic Feature but is always going to be a polygon. pointToPolygonDistance() doesn't like this.
        pointToPolygonDistance(center, feat, { units: 'kilometers', method: 'geodesic' }) / 100.0,
      )
      score += (1.0 / dist) * options.distanceBias
      item.scores = [(1.0 / dist) * options.distanceBias]

      // The natural logarithm of the area of the feature, favouring larger polygons but allowing for a wide range of sizes.
      const featureArea = Math.log(
        Math.max(1.0, convertArea(area(item.geometry), 'meters', 'kilometers')),
      )
      score += featureArea * options.areaBias
      item.scores.push(featureArea * options.areaBias)

      // Calculates the aspect ratio of the feature's bounding box, favouring squarer features over thin slivers.
      const bounds = item.bbox
      const bl = point([bounds[0], bounds[1]])
      const tl = point([bounds[0], bounds[3]])
      const br = point([bounds[2], bounds[1]])
      const height = Math.max(1.0, distance(bl, tl, { units: 'kilometers' }))
      const width = Math.max(1.0, distance(bl, br, { units: 'kilometers' }))
      const aspect = height > width ? width / height : height / width
      score += aspect * options.aspectBias
      item.scores.push(aspect * options.aspectBias)

      if (item.properties.datetime) {
        // If we have it, take the reciprocal of days since the data was captured.
        const interval = Math.max(
          1.0,
          (Date.now() - Date.parse(item.properties.datetime)) / (1000 * 60 * 60 * 24),
        )
        score += (1.0 / interval) * options.temporalBias
        item.scores.push((1.0 / interval) * options.temporalBias)
      }

      item.score = score
      return { score: score, feature: item }
    })
    .sort((a, b) => {
      return b.score - a.score
    })
    .map((i) => i.feature)
}
