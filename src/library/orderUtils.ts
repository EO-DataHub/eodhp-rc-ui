import { Item } from '@/types'

export interface OrderData {
  item: Item
  workspace: string
  collectionTitle: string
  itemTitle: string
  orderId: string
  orderDate: string
  orderStatus: string
  bundle: string
  country: string | null
  license: string | null
}

/**
 * Maps technical order status to user-friendly text
 */
export const mapOrderStatus = (status: string): string => {
  switch (status) {
    case 'succeeded':
      return 'Delivered (data is available)'
    case 'failed':
      return 'Failed'
    case 'processing':
      return 'Processing'
    case 'pending':
      return 'Pending'
    default:
      return status
  }
}

/**
 * Formats order date to readable format
 */
export const formatOrderDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch (error) {
    return dateString
  }
}

/**
 * Extracts order data from an item
 */
export const extractOrderData = (
  item: Item,
  workspace: string,
  collectionTitle: string,
): OrderData => {
  const properties = item.properties

  return {
    item,
    workspace,
    collectionTitle,
    itemTitle: properties.title ?? item.id,
    orderId: properties['order:id'] ?? item.id,
    orderDate: properties['order:date'] ?? properties.created ?? '',
    orderStatus: mapOrderStatus(properties['order:status'] ?? 'unknown'),
    bundle: properties.order_options?.productBundle ?? 'N/A',
    country: properties.order_options?.endUser?.country ?? null,
    license: properties.order_options?.licence ?? null,
  }
}

/**
 * Checks if an item has order metadata
 */
export const isOrderItem = (item: Item): boolean => {
  return !!(item.properties['order:id'] ?? item.properties['order:status'])
}
