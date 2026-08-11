import { Catalog } from '@/types'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

export const fetchCatalogs = async (): Promise<Catalog[]> => {
  const response = await fetch(`${API_URL}/api/catalogue/stac/catalogs`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch catalogs')
  }

  const data = await response.json()
  return data.catalogs as Catalog[]
}

const getSelfLink = (catalog: Catalog) => catalog.links.find((link) => link.rel === 'self')

/**
 * A stable unique identifier for a catalog, since `catalog.id` alone can repeat
 * across different catalogs at different depths (e.g. multiple "commercial-data"
 * catalogs nested under different parents).
 */
export const getCatalogKey = (catalog: Catalog): string => getSelfLink(catalog)?.href ?? catalog.id

const getCatalogDepth = (catalog: Catalog): number => {
  const selfLink = getSelfLink(catalog)
  return selfLink ? (selfLink.href.match(/\//g) ?? []).length : 0
}

/**
 * The relative path to pass to fetchCollections/fetchCatalogs-style endpoints,
 * derived from a catalog's self link (e.g. "user/catalogs/{workspace}/catalogs/{id}").
 */
export const getCatalogCollectionsPath = (catalog: Catalog): string | null => {
  const selfLink = getSelfLink(catalog)
  if (!selfLink) return null
  const marker = '/catalogs/user/catalogs/'
  const index = selfLink.href.indexOf(marker)
  if (index === -1) return null
  return selfLink.href.slice(index + '/catalogs/'.length)
}

export const fetchWorkspaceCatalogs = async (
  workspace: string,
  token: string,
): Promise<Catalog[]> => {
  const response = await fetch(
    `${API_URL}/api/catalogue/stac/catalogs/user/catalogs/${workspace}/catalogs?limit=100`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch workspace catalogs')
  }

  const data = await response.json()
  const catalogs = (data.catalogs as Catalog[]).filter(
    (catalog) => catalog.id !== 'processing-results',
  )

  return catalogs.sort((a, b) => getCatalogDepth(a) - getCatalogDepth(b))
}
