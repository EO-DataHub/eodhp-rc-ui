import { Collection } from '@/types'

const PURCHASABILITY_OVERRIDES: Record<string, boolean> = {
  'sentinel-2-c1-l2a': false,
}

const isOpenCosmosCollection = (collection: Collection): boolean =>
  collection.links.some((l) => l.rel === 'parent' && l.href.includes('/catalogs/open-cosmos'))

export const isCollectionPurchasable = (collection?: Collection): boolean => {
  if (!collection) {
    return false
  }

  if (PURCHASABILITY_OVERRIDES[collection.id] !== undefined) {
    return PURCHASABILITY_OVERRIDES[collection.id]
  }

  return collection.license === 'proprietary' || isOpenCosmosCollection(collection)
}
