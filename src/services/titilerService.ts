import type { Bbox, CogInfo } from '@/library/aoiSubset'

interface CogInfoGeoJSON {
  bbox: Bbox
  properties: {
    crs: string
    dtype: string
    count: number
    width: number
    height: number
    nodata_value?: number | null
  }
}

/**
 * Reads a GeoTIFF's header through titiler. Only the header is fetched, so this is cheap
 * even for multi-GB files.
 */
export async function fetchCogInfo(href: string): Promise<CogInfo> {
  const baseUrl = (import.meta.env.VITE_TITILER_BASE_URL as string).replace(/\/$/, '')
  const params = new URLSearchParams({ url: href })
  const response = await fetch(`${baseUrl}/core/cog/info.geojson?${params.toString()}`, {
    headers: { Accept: 'application/geo+json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to read file info: ${response.status} ${response.statusText}`)
  }

  const { bbox, properties } = (await response.json()) as CogInfoGeoJSON
  return {
    bbox,
    crs: properties.crs,
    dtype: properties.dtype,
    count: properties.count,
    width: properties.width,
    height: properties.height,
    nodata: properties.nodata_value ?? null,
  }
}
