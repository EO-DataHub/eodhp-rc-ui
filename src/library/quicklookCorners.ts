import proj4 from 'proj4'

/** Image corners in [lon, lat], in the order MapLibre wants: top left, top right, bottom right, bottom left. */
export type Corners = [[number, number], [number, number], [number, number], [number, number]]

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

  // proj:transform is the GDAL affine transform in rasterio order: x = a*col + b*row + c, y = d*col + e*row + f.
  const [a, b, c, d, e, f] = transform as number[]
  const [rows, cols] = shape as number[]
  const toLonLat = proj4(definition, 'EPSG:4326')
  const corner = (col: number, row: number): [number, number] => {
    const [lon, lat] = toLonLat.forward([a * col + b * row + c, d * col + e * row + f])
    return [lon, lat]
  }
  return unwrapLongitudes([corner(0, 0), corner(cols, 0), corner(cols, rows), corner(0, rows)])
}

/**
 * Moves each corner's longitude by 360° where needed, so that it is within 180° of the first
 * corner. For a grid that crosses the antimeridian, proj4 gives longitudes on both sides of ±180,
 * and MapLibre would stretch the image the other way round the world. MapLibre accepts
 * longitudes outside ±180 for an image source.
 */
function unwrapLongitudes(corners: Corners): Corners {
  const reference = corners[0][0]
  return corners.map(([lon, lat]) => {
    if (lon - reference > 180) return [lon - 360, lat]
    if (lon - reference < -180) return [lon + 360, lat]
    return [lon, lat]
  }) as Corners
}
