import { Collection } from '@/types'

export const extractCatalogPaths = (selectedCollection: Collection): string[] => {
  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )
  if (!parentLink?.href) return []

  const urlParts = new URL(parentLink.href).pathname.match(/\/catalogs\/(.+)/)

  return urlParts && urlParts.length > 1 ? [urlParts[1]] : []
}

export const getCatalogProvider = (selectedCollection: Collection): string => {
  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )
  if (!parentLink?.href) return ''

  const pathArray = new URL(parentLink.href).pathname.split('/')

  return pathArray[pathArray.length - 1]
}

export const getCatalog = (selectedCollection: Collection): string => {
  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )
  if (!parentLink?.href) return ''
  return parentLink.href
}
