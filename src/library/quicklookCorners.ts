import type { Geometry, Position } from 'geojson'
import proj4 from 'proj4'

/** Image corners in [lon, lat], in the order MapLibre wants: top left, top right, bottom right, bottom left. */
export type Corners = [[number, number], [number, number], [number, number], [number, number]]

/** A closed ring of [x, y] image pixel positions, with 0, 0 at the top left of the image. */
export type PixelRing = [number, number][]

// Antarctic Polar Stereographic. Landsat files scenes south of about 63.5°S in this grid.
const POLAR_SOUTH =
  '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'

/**
 * The proj4 definition for an EPSG code, for the grids that projected quicklooks use.
 * proj4 knows only a few codes by itself. Returns undefined for any other code.
 */
export function projDefinition(epsg: number): string | undefined {
  if (epsg > 32600 && epsg <= 32660)
    return `+proj=utm +zone=${epsg - 32600} +datum=WGS84 +units=m +no_defs`
  if (epsg > 32700 && epsg <= 32760)
    return `+proj=utm +zone=${epsg - 32700} +south +datum=WGS84 +units=m +no_defs`
  if (epsg === 3031) return POLAR_SOUTH
  return undefined
}

/** The EPSG code from `proj:epsg` (projection extension v1) or `proj:code` (v2, "EPSG:32630"). */
function epsgOf(properties: Record<string, unknown>): number | undefined {
  if (typeof properties['proj:epsg'] === 'number') return properties['proj:epsg']
  const code = properties['proj:code']
  if (typeof code === 'string' && code.startsWith('EPSG:')) {
    const n = Number(code.slice('EPSG:'.length))
    return Number.isInteger(n) ? n : undefined
  }
  return undefined
}

/** An item's raster grid, from the STAC projection extension. */
interface Grid {
  /** proj:transform, the GDAL affine transform in rasterio order: x = a*col + b*row + c, y = d*col + e*row + f. */
  transform: [number, number, number, number, number, number]
  rows: number
  cols: number
  /** Converts between the grid's CRS (forward from) and lon/lat. */
  toLonLat: proj4.Converter
}

/** The item's grid, or undefined when a property is missing or malformed or the CRS is unknown. */
function gridOf(properties: Record<string, unknown>): Grid | undefined {
  const transform = properties['proj:transform']
  const shape = properties['proj:shape']
  const epsg = epsgOf(properties)
  if (
    !Array.isArray(transform) ||
    transform.length < 6 ||
    !transform.slice(0, 6).every(Number.isFinite)
  )
    return
  if (
    !Array.isArray(shape) ||
    shape.length !== 2 ||
    !shape.every((n) => Number.isFinite(n) && n > 0)
  )
    return
  const definition = epsg === undefined ? undefined : projDefinition(epsg)
  if (!definition) return
  const [rows, cols] = shape as number[]
  return {
    transform: transform.slice(0, 6) as Grid['transform'],
    rows,
    cols,
    toLonLat: proj4(definition, 'EPSG:4326'),
  }
}

/**
 * The corners of an item's image grid, from the STAC projection extension: `proj:transform`,
 * `proj:shape` and `proj:epsg` (or `proj:code`).
 *
 * Use this for a quicklook that covers the item's whole grid, north-up in that grid, such as
 * Landsat's reduced_resolution_browse. The item's bbox is the box around its footprint in
 * lon/lat, which can be kilometres away from the grid's corners. Returns undefined when the
 * item lacks these properties or uses a grid this does not know, so the caller can fall back.
 */
export function projectedImageCorners(properties: Record<string, unknown>): Corners | undefined {
  const grid = gridOf(properties)
  if (!grid) return
  const [a, b, c, d, e, f] = grid.transform
  const { rows, cols, toLonLat } = grid
  const corner = (col: number, row: number): [number, number] => {
    const [lon, lat] = toLonLat.forward([a * col + b * row + c, d * col + e * row + f])
    return [lon, lat]
  }
  return unwrapLongitudes([corner(0, 0), corner(cols, 0), corner(cols, rows), corner(0, rows)])
}

/**
 * Keeps the corners of a grid that crosses the antimeridian together, in a form MapLibre's
 * image source accepts.
 *
 * proj4 gives longitudes on both sides of ±180 for such a grid, and MapLibre would stretch the
 * image the other way round the world. So each corner moves by 360° where needed, to within
 * 180° of the first corner. MapLibre accepts corners outside ±180, and draws them in the next
 * copy of the world. It does not accept a centre outside ±180: it places the image in the tile
 * under the middle of its corners, and fails with "outside of bounds" for a tile beyond the
 * edge of the world. So if the middle is outside [-180, 180), all four corners move by 360°.
 */
function unwrapLongitudes(corners: Corners): Corners {
  const reference = corners[0][0]
  const together = corners.map(([lon, lat]) => {
    if (lon - reference > 180) return [lon - 360, lat]
    if (lon - reference < -180) return [lon + 360, lat]
    return [lon, lat]
  })
  const lons = together.map(([lon]) => lon)
  const middle = (Math.min(...lons) + Math.max(...lons)) / 2
  const shift = middle >= 180 ? -360 : middle < -180 ? 360 : 0
  return together.map(([lon, lat]) => [lon + shift, lat]) as Corners
}

/**
 * The item's footprint as rings of pixel positions in a quicklook of `width` × `height` pixels
 * that covers the item's whole grid. The quicklook need not have the grid's aspect ratio:
 * Landsat stretches every browse image to 1024 × 1024.
 *
 * Use the rings to clear the quicklook's border outside the footprint. Holes and the parts of
 * a MultiPolygon are separate rings, so fill them with the even-odd rule. Returns undefined
 * when the grid is unknown, as for `projectedImageCorners`, or the geometry is not a polygon.
 */
export function footprintInImagePixels(
  properties: Record<string, unknown>,
  geometry: Geometry | undefined,
  width: number,
  height: number,
): PixelRing[] | undefined {
  const grid = gridOf(properties)
  if (!grid) return
  let rings: Position[][]
  if (geometry?.type === 'Polygon') rings = geometry.coordinates
  else if (geometry?.type === 'MultiPolygon') rings = geometry.coordinates.flat()
  else return
  const [a, b, c, d, e, f] = grid.transform
  const determinant = a * e - b * d
  if (determinant === 0) return
  const scaleX = width / grid.cols
  const scaleY = height / grid.rows
  const toPixel = ([lon, lat]: Position): [number, number] => {
    const [x, y] = grid.toLonLat.inverse([lon, lat])
    // Invert the affine transform to get the grid column and row.
    const col = (e * (x - c) - b * (y - f)) / determinant
    const row = (a * (y - f) - d * (x - c)) / determinant
    return [col * scaleX, row * scaleY]
  }
  return rings.map((ring) => ring.map(toPixel))
}
