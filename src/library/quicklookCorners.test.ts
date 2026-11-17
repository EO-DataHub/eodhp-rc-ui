import { describe, expect, test } from 'vitest'
import { projDefinition, projectedImageCorners, type Corners } from './quicklookCorners'

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
