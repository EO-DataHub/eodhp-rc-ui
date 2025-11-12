import pLimit from 'p-limit'
import { Collection } from '@/types'
import { fetchWorkspaces, fetchWorkspaceTokens } from './workspaceTokenService'
import { fetchUserCollections } from './collectionService'
import { fetchUserItemsByParams } from './itemService'
import { OrderData, extractOrderData, isOrderItem } from '@/library/orderUtils'

/**
 * Fetches all orders from all workspaces
 */
export const fetchAllOrders = async (token: string): Promise<OrderData[]> => {
  if (!token) return []
  try {
    const workspaces = await fetchWorkspaces(token)
    const limit = pLimit(5)
    const workspacePromises = workspaces.map((workspace) =>
      limit(async () => {
        const workspaceTokens = await fetchWorkspaceTokens(workspace.name, token)
        const collections = await fetchUserCollections(workspace.name, workspaceTokens.access)
        const collectionPromises = collections.map((collection) =>
          limit(async () => {
            const catalogPath = extractCatalogPath(collection)
            if (!catalogPath) return [] as OrderData[]
            const items = await fetchUserItemsByParams(
              workspace.name,
              collection.id,
              catalogPath,
              workspaceTokens.access,
            )
            const orderItems = items.filter(isOrderItem)
            return orderItems.map((item) =>
              extractOrderData(item, workspace.name, collection.title ?? collection.id),
            )
          }),
        )
        const settledCollections = await Promise.allSettled(collectionPromises)
        return settledCollections
          .filter((r): r is PromiseFulfilledResult<OrderData[]> => r.status === 'fulfilled')
          .flatMap((r) => r.value)
      }),
    )
    const settledWorkspaces = await Promise.allSettled(workspacePromises)
    const allOrders = settledWorkspaces
      .filter((r): r is PromiseFulfilledResult<OrderData[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
    return allOrders
  } catch (error) {
    return []
  }
}

/**
 * Extracts catalog path from collection links
 */
const extractCatalogPath = (collection: Collection): string | null => {
  // Look for a link that contains the catalog path
  // Based on the URL pattern: /catalogs/{catalogPath}/collections/{collectionId}
  const selfLink = collection.links.find((link) => link.rel === 'self')
  if (!selfLink) return null

  const url = selfLink.href
  const match = url.match(/\/catalogs\/([^/]+)\/collections\//)
  return match ? match[1] : null
}
