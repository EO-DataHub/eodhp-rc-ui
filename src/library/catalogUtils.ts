import { Collection } from '@/types'

export const extractCatalogPaths = (selectedCollection: Collection): string[] => {
  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )
  if (!parentLink?.href) return []

  const urlParts = new URL(parentLink.href).pathname.split('/catalogs/')
  return urlParts.length > 1 ? [urlParts[1]] : []
}

export const getCatalog = (selectedCollection: Collection): string => {
  const catalogPaths = extractCatalogPaths(selectedCollection).map(
    (path) => path.split('/').pop() ?? path,
  )
  return catalogPaths[0] || ''
}
