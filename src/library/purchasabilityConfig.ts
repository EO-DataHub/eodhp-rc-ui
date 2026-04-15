import { Collection } from '@/types'

const PURCHASABILITY_OVERRIDES: Record<string, boolean> = {
  'sentinel-2-c1-l2a': false,
}

export const isCollectionPurchasable = (collection?: Collection): boolean => {
  if (!collection) {
    return false
  }

  const override = PURCHASABILITY_OVERRIDES[collection.id]
  if (override !== undefined) {
    return override
  }

  return collection.license === 'proprietary'
}
