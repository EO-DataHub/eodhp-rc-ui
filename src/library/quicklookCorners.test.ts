import { describe, expect, test } from 'vitest'
import {
  footprintInImagePixels,
  projDefinition,
  projectedImageCorners,
  type Corners,
  type PixelRing,
} from './quicklookCorners'

// Real Landsat items from the test catalogue. The expected corners were computed independently
// with pyproj from the same properties.
const UTM_ITEM = {
  // LC09_L2SP_091091_20261115_02_T2, Tasmania
  'proj:epsg': 32655,
  'proj:shape': [7791, 7791],
  'proj:transform': [30, 0, 234585, 0, -30, -4824585],
}
const UTM_CORNERS: Corners = [
  [143.71559, -43.52703],
  [146.6076, -43.57355],
  [146.59316, -45.67766],
  [143.59502, -45.62761],
]

const POLAR_ITEM = {
  // LC09_L2SR_075109_20261115_02_T2, Antarctica
  'proj:epsg': 3031,
  'proj:shape': [6651, 6741],
  'proj:transform': [30, 0, 898485, 0, -30, -1902585],
}
const POLAR_CORNERS: Corners = [
  [154.72124, -70.80907],
  [149.94905, -69.96827],
  [152.36243, -68.40984],
  [156.85719, -69.18252],
]

function expectCorners(actual: Corners | undefined, expected: Corners) {
  expect(actual).toBeDefined()
  actual!.forEach(([lon, lat], i) => {
    expect(lon).toBeCloseTo(expected[i][0], 4)
    expect(lat).toBeCloseTo(expected[i][1], 4)
  })
}

describe('projectedImageCorners', () => {
  test('projects the corners of a UTM grid in MapLibre order', () => {
    expectCorners(projectedImageCorners(UTM_ITEM), UTM_CORNERS)
  })

  test('projects the corners of an Antarctic polar stereographic grid', () => {
    expectCorners(projectedImageCorners(POLAR_ITEM), POLAR_CORNERS)
  })

  test('keeps a grid that crosses the antimeridian in one piece', () => {
    // A grid in UTM zone 60S near Fiji that runs past 180°. pyproj gives the east corners
    // as -178.97862 and -178.93434; they come back 360° further east.
    const fiji = {
      'proj:epsg': 32760,
      'proj:shape': [7700, 7700],
      'proj:transform': [30, 0, 700000, 0, -30, 8250000],
    }
    expectCorners(projectedImageCorners(fiji), [
      [178.86737, -15.82078],
      [181.02138, -15.79156],
      [181.06566, -17.8745],
      [178.88798, -17.90781],
    ])
  })

  test('keeps the middle of a grid that crosses the antimeridian within ±180°', () => {
    // The same zone, 100 km further east, so most of the grid is east of 180°. pyproj gives
    // corners of 179.80038, -178.04786, -177.99343 and 179.83127. Kept together, their middle
    // would be about 180.9°, which MapLibre's image source refuses, so all four move west.
    const eastOf180 = {
      'proj:epsg': 32760,
      'proj:shape': [7700, 7700],
      'proj:transform': [30, 0, 800000, 0, -30, 8250000],
    }
    expectCorners(projectedImageCorners(eastOf180), [
      [-180.19962, -15.81075],
      [-178.04786, -15.77232],
      [-177.99343, -17.85257],
      [-180.16873, -17.89637],
    ])
  })

  test('accepts proj:code from version 2 of the projection extension', () => {
    const v2 = { ...UTM_ITEM, 'proj:epsg': undefined, 'proj:code': 'EPSG:32655' }
    expectCorners(projectedImageCorners(v2), UTM_CORNERS)
  })

  test('returns undefined when a projection property is missing, so the caller can fall back', () => {
    expect(projectedImageCorners({})).toBeUndefined()
    expect(projectedImageCorners({ ...UTM_ITEM, 'proj:transform': undefined })).toBeUndefined()
    expect(projectedImageCorners({ ...UTM_ITEM, 'proj:shape': undefined })).toBeUndefined()
    expect(projectedImageCorners({ ...UTM_ITEM, 'proj:epsg': undefined })).toBeUndefined()
  })

  test('returns undefined for malformed values', () => {
    expect(
      projectedImageCorners({ ...UTM_ITEM, 'proj:transform': [30, 0, 234585] }),
    ).toBeUndefined()
    expect(projectedImageCorners({ ...UTM_ITEM, 'proj:shape': [0, 7791] })).toBeUndefined()
    expect(
      projectedImageCorners({ ...UTM_ITEM, 'proj:code': 'EPSG:x', 'proj:epsg': undefined }),
    ).toBeUndefined()
  })

  test('returns undefined for a grid it has no definition for', () => {
    expect(projectedImageCorners({ ...UTM_ITEM, 'proj:epsg': 27700 })).toBeUndefined()
  })
})

// The footprints of the same two items, and the pixel positions in their 1024 × 1024 browse
// images that pyproj gives for each vertex.
const UTM_FOOTPRINT: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [144.28708898524295, -43.54770136239131],
      [143.6487133265501, -45.24250169618192],
      [146.00819664114644, -45.668410381350746],
      [146.5799866005021, -43.96323335913999],
      [144.28708898524295, -43.54770136239131],
    ],
  ],
}
const UTM_PIXELS: PixelRing = [
  [202.671, 2.76],
  [10.515, 835.787],
  [824.352, 1021.24],
  [1015.194, 189.659],
  [202.671, 2.76],
]
const POLAR_FOOTPRINT: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [150.1578892885239, -70.00576165672194],
      [154.72370013912362, -70.75952866990785],
      [156.7264466837598, -69.16344293801045],
      [152.37364949745407, -68.45085140906068],
      [150.11869037765302, -69.99682211698224],
      [150.1578892885239, -70.00576165672194],
    ],
  ],
}
const POLAR_PIXELS: PixelRing = [
  [978.276, 1.848],
  [11.545, 25.866],
  [28.558, 1023.538],
  [1011.088, 1004.139],
  [987.391, 2.463],
  [978.276, 1.848],
]

function expectRing(actual: PixelRing, expected: PixelRing) {
  expect(actual).toHaveLength(expected.length)
  actual.forEach(([x, y], i) => {
    expect(x).toBeCloseTo(expected[i][0], 2)
    expect(y).toBeCloseTo(expected[i][1], 2)
  })
}

describe('footprintInImagePixels', () => {
  test('places a UTM footprint in the browse image', () => {
    const rings = footprintInImagePixels(UTM_ITEM, UTM_FOOTPRINT, 1024, 1024)
    expect(rings).toHaveLength(1)
    expectRing(rings![0], UTM_PIXELS)
  })

  test('scales each axis on its own when the image is stretched from a grid that is not square', () => {
    // The polar grid is 6741 × 6651 pixels, but its browse image is 1024 × 1024.
    const rings = footprintInImagePixels(POLAR_ITEM, POLAR_FOOTPRINT, 1024, 1024)
    expectRing(rings![0], POLAR_PIXELS)
  })

  test('gives one ring per part of a MultiPolygon', () => {
    const multi: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [UTM_FOOTPRINT.coordinates, UTM_FOOTPRINT.coordinates],
    }
    const rings = footprintInImagePixels(UTM_ITEM, multi, 1024, 1024)
    expect(rings).toHaveLength(2)
    expectRing(rings![1], UTM_PIXELS)
  })

  test('returns undefined without a polygon or a known grid', () => {
    expect(footprintInImagePixels(UTM_ITEM, undefined, 1024, 1024)).toBeUndefined()
    const point: GeoJSON.Point = { type: 'Point', coordinates: [144, -44] }
    expect(footprintInImagePixels(UTM_ITEM, point, 1024, 1024)).toBeUndefined()
    expect(
      footprintInImagePixels({ ...UTM_ITEM, 'proj:epsg': 27700 }, UTM_FOOTPRINT, 1024, 1024),
    ).toBeUndefined()
  })
})

describe('projDefinition', () => {
  test('builds UTM north and south zones', () => {
    expect(projDefinition(32630)).toContain('+zone=30 ')
    expect(projDefinition(32630)).not.toContain('+south')
    expect(projDefinition(32755)).toContain('+zone=55 +south')
  })

  test('knows nothing outside the UTM zones and the Antarctic grid', () => {
    expect(projDefinition(32600)).toBeUndefined()
    expect(projDefinition(32661)).toBeUndefined()
    expect(projDefinition(4326)).toBeUndefined()
  })
})
