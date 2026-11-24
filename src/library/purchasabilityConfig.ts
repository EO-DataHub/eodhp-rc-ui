import { Collection } from '@/types'

// Earth Search labels these open collections 'proprietary', which would otherwise mark them purchasable
const PURCHASABILITY_OVERRIDES: Record<string, boolean> = {
  'sentinel-2-c1-l2a': false,
  'landsat-c2-l2': false,
}

export const isCollectionPurchasable = (collection?: Collection): boolean => {
  if (!collection) {
    return false
  }

  return PURCHASABILITY_OVERRIDES[collection.id] ?? collection.license === 'proprietary'
}
