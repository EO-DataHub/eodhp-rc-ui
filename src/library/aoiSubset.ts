import { bbox as turfBbox } from '@turf/turf'

export type Bbox = [number, number, number, number]

/** The subset of titiler `/cog/info.geojson` we rely on. */
export interface CogInfo {
  /** Geographic (EPSG:4326) bounds of the raster */
  bbox: Bbox
  /** Native CRS as an OGC URI, e.g. http://www.opengis.net/def/crs/EPSG/0/27700 */
  crs: string
  dtype: string
  count: number
  width: number
  height: number
  nodata: number | null
}

export interface SubsettableAssetLike {
  href: string
  type?: string
  roles?: string[]
}

export type AoiSubsetStatus =
  | { state: 'no-aoi' }
  | { state: 'no-overlap' }
  | { state: 'too-large'; bytes: number; maxBytes: number }
  | { state: 'ok'; bytes: number; url: string; warn: boolean }

const MB = 1024 * 1024
const DEFAULT_WARN_MB = 100
const DEFAULT_MAX_MB = 250
// The size estimate uses a lon/lat area fraction, so pad the hard cap to absorb the error
const ESTIMATE_MARGIN = 1.1

const DTYPE_BYTES: Record<string, number> = {
  uint8: 1,
  int8: 1,
  uint16: 2,
  int16: 2,
  uint32: 4,
  int32: 4,
  float32: 4,
  uint64: 8,
  int64: 8,
  float64: 8,
  complex64: 8,
  complex128: 16,
}

const EXCLUDED_ROLES = ['thumbnail', 'overview']

/**
 * An asset can be subset when it is a (Geo)TIFF holding data. Catalogue metadata rarely
 * declares `profile=cloud-optimized`, so any TIFF qualifies; titiler copes with non-COGs.
 */
export function isSubsettableAsset(asset: SubsettableAssetLike): boolean {
  if (!asset.type?.toLowerCase().startsWith('image/tiff')) return false
  const roles = asset.roles ?? []
  if (roles.some((role) => EXCLUDED_ROLES.includes(role))) return false
  return roles.length === 0 || roles.includes('data')
}

export function getAoiBbox(aoi: GeoJSON.Feature): Bbox {
  return turfBbox(aoi) as Bbox
}

/** Intersection of two lon/lat bboxes, or null when they don't overlap. */
export function intersectBbox(a: Bbox, b: Bbox): Bbox | null {
  const minx = Math.max(a[0], b[0])
  const miny = Math.max(a[1], b[1])
  const maxx = Math.min(a[2], b[2])
  const maxy = Math.min(a[3], b[3])
  if (minx >= maxx || miny >= maxy) return null
  return [minx, miny, maxx, maxy]
}

/**
 * Estimated size of the uncompressed GeoTIFF titiler returns for `clipped`. Pixels are taken
 * as the lon/lat area fraction of the raster's geographic bbox, which avoids needing a proj4
 * definition for every native CRS and is within a few percent for typical scenes.
 */
export function estimateSubsetBytes(info: CogInfo, clipped: Bbox): number {
  const bboxArea = (b: Bbox) => (b[2] - b[0]) * (b[3] - b[1])
  const rasterArea = bboxArea(info.bbox)
  if (rasterArea <= 0) return 0
  const fraction = Math.min(1, bboxArea(clipped) / rasterArea)
  const bytesPerSample = DTYPE_BYTES[info.dtype] ?? 8
  return Math.round(info.width * info.height * fraction * info.count * bytesPerSample)
}

function readMbEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getAoiSubsetLimits(): { warnBytes: number; maxBytes: number } {
  return {
    warnBytes: readMbEnv(import.meta.env.VITE_AOI_SUBSET_WARN_MB, DEFAULT_WARN_MB) * MB,
    maxBytes: readMbEnv(import.meta.env.VITE_AOI_SUBSET_MAX_MB, DEFAULT_MAX_MB) * MB,
  }
}

/**
 * Titiler URL for a native-CRS, native-resolution crop of `href` to `bbox` (lon/lat).
 * `return_mask=false` stops titiler appending an alpha band, so band count matches the source.
 * `filename` is ignored by titiler today; it is sent so a Content-Disposition header can use it.
 */
export function buildAoiSubsetUrl({
  href,
  bbox,
  dstCrs,
  filename,
}: {
  href: string
  bbox: Bbox
  dstCrs: string
  filename: string
}): string {
  const baseUrl = (import.meta.env.VITE_TITILER_BASE_URL as string).replace(/\/$/, '')
  const params = new URLSearchParams({
    url: href,
    dst_crs: dstCrs,
    return_mask: 'false',
    filename,
  })
  return `${baseUrl}/core/cog/bbox/${bbox.join(',')}.tif?${params.toString()}`
}

export function getAoiSubsetFilename(itemId: string, assetKey: string): string {
  return `${itemId}_${assetKey}_aoi.tif`.replace(/[^\w.-]+/g, '_')
}

export function getAoiSubsetStatus({
  aoi,
  info,
  href,
  filename,
}: {
  aoi: GeoJSON.Feature | undefined
  info: CogInfo
  href: string
  filename: string
}): AoiSubsetStatus {
  if (!aoi) return { state: 'no-aoi' }

  const clipped = intersectBbox(getAoiBbox(aoi), info.bbox)
  if (!clipped) return { state: 'no-overlap' }

  const bytes = estimateSubsetBytes(info, clipped)
  const { warnBytes, maxBytes } = getAoiSubsetLimits()
  if (bytes * ESTIMATE_MARGIN > maxBytes) return { state: 'too-large', bytes, maxBytes }

  return {
    state: 'ok',
    bytes,
    warn: bytes > warnBytes,
    url: buildAoiSubsetUrl({ href, bbox: clipped, dstCrs: info.crs, filename }),
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * MB) return `${Math.round(bytes / MB)} MB`
  return `${(bytes / (1024 * MB)).toFixed(1)} GB`
}
