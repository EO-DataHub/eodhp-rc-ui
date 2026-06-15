import { Collection } from '@/types'

const PURCHASABILITY_OVERRIDES: Record<string, boolean> = {
  'sentinel-2-c1-l2a': false,
}

export const isCollectionPurchasable = (collection?: Collection): boolean => {
  if (!collection) {
    return false
  }

  return PURCHASABILITY_OVERRIDES[collection.id] ?? collection.license === 'proprietary'
}
