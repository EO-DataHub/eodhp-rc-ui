import { Collection } from '@/types'

export const extractCatalogPaths = (selectedCollection: Collection): string[] => {
  const parentLink = getCatalog(selectedCollection)

  const urlParts = new URL(parentLink).pathname.match(/\/catalogs\/(.+)/)

  return urlParts && urlParts.length > 1 ? [urlParts[1]] : []
}

export const getCatalog = (selectedCollection: Collection): string => {
  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )?.href
  if (!parentLink) {
    throw new Error("No 'parent' link found in collection.")
  }
  return parentLink
}
