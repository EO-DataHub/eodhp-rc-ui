import { Collection } from '@/types'

export const extractCatalogPaths = (selectedCollection?: Collection): string[] => {
  const defaultCatalogPath = ['supported-datasets/ceda-stac-catalogue']

  if (!selectedCollection) return defaultCatalogPath

  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )
  if (!parentLink?.href) return defaultCatalogPath

  const urlParts = new URL(parentLink.href).pathname.split('/catalogs/')
  return urlParts.length > 1 ? [urlParts[1]] : defaultCatalogPath
}

export const getCatalog = (selectedCollection: Collection): string => {
  const defaultCatalog = 'ceda-stac-catalogue'

  if (!selectedCollection) return defaultCatalog

  const catalogPaths = extractCatalogPaths(selectedCollection).map(
    (path) => path.split('/').pop() ?? path,
  )

  return catalogPaths[0] || defaultCatalog
}
