import { Collection } from '@/types'

export const extractCatalogPaths = (selectedCollection: Collection): string[] => {
  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )
  if (!parentLink?.href) return []

  const urlParts = new URL(parentLink.href).pathname.match(/\/catalogs\/(.+)/)

  return urlParts && urlParts.length > 1 ? [urlParts[1]] : []
}

export const getCatalog = (selectedCollection: Collection): string => {
  const catalogPaths = extractCatalogPaths(selectedCollection)
  if (catalogPaths.length === 0) return ''
  const path = catalogPaths[0]
  return getCatalogByURL(path)
}

export const getCatalogByURL = (path: string): string => {
  // Matches "supported-datasets/", optionally followed by "/catalogs/" in staging,
  // and captures the next segment until "/"
  const match = path.match(/\/?supported-datasets(?:\/catalogs)?\/([^/]+)/)
  return match ? match[1] : ''
}
