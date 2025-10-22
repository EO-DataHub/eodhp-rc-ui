import { Collection } from '@/types'
import { fetchWorkspaces, fetchWorkspaceTokens } from './workspaceTokenService'
import { fetchUserCollections } from './collectionService'
import { fetchUserItemsByParams } from './itemService'
import { OrderData, extractOrderData, isOrderItem } from '@/library/orderUtils'

/**
 * Fetches all orders from all workspaces
 */
export const fetchAllOrders = async (token: string): Promise<OrderData[]> => {
  if (!token) {
    return []
  }

  try {
    // Fetch all workspaces
    const workspaces = await fetchWorkspaces(token)

    const allOrders: OrderData[] = []

    // Process each workspace
    for (const workspace of workspaces) {
      try {
        // Get workspace tokens
        const workspaceTokens = await fetchWorkspaceTokens(workspace.name, token)

        // Get collections for this workspace
        const collections = await fetchUserCollections(workspace.name, workspaceTokens.access)

        // Process each collection
        for (const collection of collections) {
          try {
            // Extract catalog path from collection links
            const catalogPath = extractCatalogPath(collection)
            if (!catalogPath) continue

            // Fetch items for this collection
            const items = await fetchUserItemsByParams(
              workspace.name,
              collection.id,
              catalogPath,
              workspaceTokens.access,
            )

            // Extract order data from items
            const orderItems = items.filter(isOrderItem)
            const orders = orderItems.map((item) =>
              extractOrderData(item, workspace.name, collection.title ?? collection.id),
            )

            allOrders.push(...orders)
          } catch (error) {
            // Continue with other collections
          }
        }
      } catch (error) {
        // Continue with other workspaces
      }
    }

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
