import pLimit from 'p-limit'
import { Collection } from '@/types'
import { fetchWorkspaces, fetchWorkspaceTokens } from './workspaceTokenService'
import { fetchUserCollections } from './collectionService'
import { fetchUserItemsByParamsWithMetadata, fetchUserItemsFromUrl } from './itemService'
import { OrderData, extractOrderData, isOrderItem } from '@/library/orderUtils'

// Configuration constants for order fetching optimization
const ORDER_FETCH_LIMIT_PER_COLLECTION = 200
const MAX_WORKSPACE_CONCURRENCY = 2
const MAX_COLLECTION_CONCURRENCY = 3

export interface OrderFetchResult {
  orders: OrderData[]
  totalItemsMatched: number | null
  hasMore: boolean
  collectionMetadata: {
    workspace: string
    collectionId: string
    catalogPath: string
    collectionTitle: string
    numMatched: number | null
    hasMore: boolean
    nextUrl: string | null
  }[]
}

/**
 * Fetches orders for a single workspace
 * Returns orders with metadata about availability
 */
export const fetchOrdersForWorkspace = async (
  workspaceName: string,
  token: string,
): Promise<OrderFetchResult> => {
  if (!token || !workspaceName) {
    return {
      orders: [],
      totalItemsMatched: null,
      hasMore: false,
      collectionMetadata: [],
    }
  }
  try {
    const workspaceTokens = await fetchWorkspaceTokens(workspaceName, token)
    const collections = await fetchUserCollections(workspaceName, workspaceTokens.access)
    const concurrencyLimit = pLimit(MAX_COLLECTION_CONCURRENCY)

    const collectionMetadata: OrderFetchResult['collectionMetadata'] = []
    const allOrders: OrderData[] = []

    const collectionPromises = collections.map((collection) =>
      concurrencyLimit(async () => {
        const catalogPath = extractCatalogPath(collection)
        if (!catalogPath) {
          return {
            orders: [],
            numMatched: null,
            hasMore: false,
            collectionId: collection.id,
            collectionTitle: collection.title ?? collection.id,
          }
        }

        const result = await fetchOrderItemsFromCollection(
          workspaceName,
          collection.id,
          catalogPath,
          workspaceTokens.access,
          collection.title ?? collection.id,
        )

        // Store metadata for this collection
        const metadata = {
          workspace: workspaceName,
          collectionId: collection.id,
          catalogPath,
          collectionTitle: collection.title ?? collection.id,
          numMatched: result.numMatched,
          hasMore: result.hasMore,
          nextUrl: result.nextUrl,
        }
        collectionMetadata.push(metadata)

        return {
          ...result,
          collectionId: collection.id,
          collectionTitle: collection.title ?? collection.id,
        }
      }),
    )

    const settledCollections = await Promise.allSettled(collectionPromises)
    const results = settledCollections
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<{
          orders: OrderData[]
          numMatched: number | null
          hasMore: boolean
          nextUrl: string | null
          collectionId: string
          collectionTitle: string
        }> => r.status === 'fulfilled',
      )
      .map((r) => r.value)

    results.forEach((result) => {
      allOrders.push(...result.orders)
    })

    // Calculate total items matched and determine if there are more orders available
    const totalItemsMatched = collectionMetadata.reduce((sum, meta) => {
      return sum + (meta.numMatched ?? 0)
    }, 0)
    const hasMore = collectionMetadata.some((meta) => meta.hasMore)

    return {
      orders: allOrders,
      totalItemsMatched: totalItemsMatched > 0 ? totalItemsMatched : null,
      hasMore,
      collectionMetadata,
    }
  } catch (error) {
    return {
      orders: [],
      totalItemsMatched: null,
      hasMore: false,
      collectionMetadata: [],
    }
  }
}

/**
 * Fetches more orders from collections that have more items available
 * Used for progressive loading when user clicks "Load More"
 */
export const fetchMoreOrders = async (
  token: string,
  collectionMetadata: OrderFetchResult['collectionMetadata'],
): Promise<OrderFetchResult> => {
  if (!token) {
    return {
      orders: [],
      totalItemsMatched: null,
      hasMore: false,
      collectionMetadata: [],
    }
  }

  try {
    // Filter to only collections that have more items available
    // If nextUrl is null but hasMore is true, we need to reconstruct the URL
    const collectionsToFetch = collectionMetadata.filter((meta) => {
      if (!meta.hasMore) return false
      // If we have nextUrl, use it. Otherwise, we'll need to reconstruct the URL
      return true
    })

    if (collectionsToFetch.length === 0) {
      return {
        orders: [],
        totalItemsMatched: null,
        hasMore: false,
        collectionMetadata: [],
      }
    }

    // Group by workspace to fetch tokens efficiently
    const workspacesMap = new Map<string, string>()
    const workspacePromises = Array.from(new Set(collectionsToFetch.map((c) => c.workspace))).map(
      async (workspaceName) => {
        const workspaceTokens = await fetchWorkspaceTokens(workspaceName, token)
        workspacesMap.set(workspaceName, workspaceTokens.access)
      },
    )
    await Promise.all(workspacePromises)

    const collectionLimit = pLimit(MAX_COLLECTION_CONCURRENCY)
    const newOrders: OrderData[] = []
    const updatedMetadata: OrderFetchResult['collectionMetadata'] = []

    const collectionPromises = collectionsToFetch.map((meta) =>
      collectionLimit(async () => {
        const workspaceToken = workspacesMap.get(meta.workspace)
        if (!workspaceToken) return null

        let items, numMatched, hasMore, nextUrl

        if (meta.nextUrl) {
          // Fetch next batch using the pagination URL
          const result = await fetchUserItemsFromUrl(
            meta.nextUrl,
            workspaceToken,
            ORDER_FETCH_LIMIT_PER_COLLECTION,
          )
          items = result.items
          numMatched = result.numMatched
          hasMore = result.hasMore
          nextUrl = result.nextUrl
        } else {
          // If nextUrl is null but hasMore is true, we need to fetch more
          // Since STAC uses cursor-based pagination, we can't use offset
          // Instead, fetch with a higher limit to get the next batch
          // Note: This will fetch from the beginning, so we need to skip items we've already seen
          // For now, fetch with a limit that includes what we've already fetched + more
          const estimatedAlreadyFetched = ORDER_FETCH_LIMIT_PER_COLLECTION // We fetched 200 initially
          const fetchLimit = estimatedAlreadyFetched + ORDER_FETCH_LIMIT_PER_COLLECTION

          const result = await fetchUserItemsByParamsWithMetadata(
            meta.workspace,
            meta.collectionId,
            meta.catalogPath,
            workspaceToken,
            fetchLimit,
          )

          // Skip items we've already fetched (first batch)
          // This is a workaround - ideally the API would provide a nextUrl
          const allItems = result.items
          items = allItems.slice(estimatedAlreadyFetched) // Skip first batch
          numMatched = result.numMatched
          hasMore = result.hasMore
          nextUrl = result.nextUrl
        }

        // Filter for order items and extract order data
        const orderItems = items.filter(isOrderItem)
        const orders = orderItems.map((item) =>
          extractOrderData(item, meta.workspace, meta.collectionTitle),
        )

        // Update metadata
        updatedMetadata.push({
          ...meta,
          numMatched,
          hasMore,
          nextUrl,
        })

        return orders
      }),
    )

    const settledCollections = await Promise.allSettled(collectionPromises)
    const results = settledCollections
      .filter(
        (r): r is PromiseFulfilledResult<OrderData[]> =>
          r.status === 'fulfilled' && r.value !== null,
      )
      .map((r) => r.value)

    results.forEach((orders) => {
      newOrders.push(...orders)
    })

    // Merge with existing metadata for collections that weren't fetched
    const fetchedKeys = new Set(
      updatedMetadata.map((m) => `${m.workspace}:${m.collectionId}:${m.catalogPath}`),
    )
    collectionMetadata.forEach((meta) => {
      const key = `${meta.workspace}:${meta.collectionId}:${meta.catalogPath}`
      if (!fetchedKeys.has(key)) {
        updatedMetadata.push(meta)
      }
    })

    const totalItemsMatched = updatedMetadata.reduce((sum, meta) => {
      return sum + (meta.numMatched ?? 0)
    }, 0)
    const hasMore = updatedMetadata.some((meta) => meta.hasMore)

    return {
      orders: newOrders,
      totalItemsMatched: totalItemsMatched > 0 ? totalItemsMatched : null,
      hasMore,
      collectionMetadata: updatedMetadata,
    }
  } catch (error) {
    return {
      orders: [],
      totalItemsMatched: null,
      hasMore: false,
      collectionMetadata: [],
    }
  }
}

/**
 * Fetches all orders from all workspaces with optimized performance
 * Uses reduced concurrency and smaller item limits to prevent browser hangs
 * Returns orders with metadata about availability
 */
export const fetchAllOrders = async (token: string): Promise<OrderFetchResult> => {
  if (!token) {
    return {
      orders: [],
      totalItemsMatched: null,
      hasMore: false,
      collectionMetadata: [],
    }
  }
  try {
    const workspaces = await fetchWorkspaces(token)
    // Reduced concurrency for workspace-level operations to prevent browser overload
    const workspaceLimit = pLimit(MAX_WORKSPACE_CONCURRENCY)
    const collectionLimit = pLimit(MAX_COLLECTION_CONCURRENCY)

    const collectionMetadata: OrderFetchResult['collectionMetadata'] = []
    const allOrders: OrderData[] = []

    const workspacePromises = workspaces.map((workspace) =>
      workspaceLimit(async () => {
        try {
          const workspaceTokens = await fetchWorkspaceTokens(workspace.name, token)
          const collections = await fetchUserCollections(workspace.name, workspaceTokens.access)

          const collectionPromises = collections.map((collection) =>
            collectionLimit(async () => {
              const catalogPath = extractCatalogPath(collection)
              if (!catalogPath) {
                return {
                  orders: [],
                  numMatched: null,
                  hasMore: false,
                  nextUrl: null,
                  collectionId: collection.id,
                  collectionTitle: collection.title ?? collection.id,
                }
              }

              const result = await fetchOrderItemsFromCollection(
                workspace.name,
                collection.id,
                catalogPath,
                workspaceTokens.access,
                collection.title ?? collection.id,
              )

              // Store metadata for this collection
              const metadata = {
                workspace: workspace.name,
                collectionId: collection.id,
                catalogPath,
                collectionTitle: collection.title ?? collection.id,
                numMatched: result.numMatched,
                hasMore: result.hasMore,
                nextUrl: result.nextUrl,
              }
              collectionMetadata.push(metadata)

              return {
                ...result,
                collectionId: collection.id,
                collectionTitle: collection.title ?? collection.id,
              }
            }),
          )

          const settledCollections = await Promise.allSettled(collectionPromises)
          return settledCollections
            .filter(
              (
                r,
              ): r is PromiseFulfilledResult<{
                orders: OrderData[]
                numMatched: number | null
                hasMore: boolean
                nextUrl: string | null
                collectionId: string
                collectionTitle: string
              }> => r.status === 'fulfilled',
            )
            .flatMap((r) => r.value.orders)
        } catch (error) {
          // Return empty array on workspace error to allow other workspaces to continue
          return []
        }
      }),
    )

    const settledWorkspaces = await Promise.allSettled(workspacePromises)
    const ordersFromWorkspaces = settledWorkspaces
      .filter((r): r is PromiseFulfilledResult<OrderData[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)

    allOrders.push(...ordersFromWorkspaces)

    // Calculate total items matched and determine if there are more orders available
    const totalItemsMatched = collectionMetadata.reduce((sum, meta) => {
      return sum + (meta.numMatched ?? 0)
    }, 0)
    const hasMore = collectionMetadata.some((meta) => meta.hasMore)

    return {
      orders: allOrders,
      totalItemsMatched: totalItemsMatched > 0 ? totalItemsMatched : null,
      hasMore,
      collectionMetadata,
    }
  } catch (error) {
    return {
      orders: [],
      totalItemsMatched: null,
      hasMore: false,
      collectionMetadata: [],
    }
  }
}

/**
 * Fetches order items from a collection with optimized limit
 * Uses the configured ORDER_FETCH_LIMIT_PER_COLLECTION to reduce API calls
 * Returns orders along with metadata about availability
 */
const fetchOrderItemsFromCollection = async (
  workspaceName: string,
  collectionId: string,
  catalogPath: string,
  workspaceToken: string,
  collectionTitle: string,
): Promise<{
  orders: OrderData[]
  numMatched: number | null
  hasMore: boolean
  nextUrl: string | null
}> => {
  try {
    // Fetch items with metadata using the optimized limit (200 instead of 10,000)
    const { items, numMatched, hasMore, nextUrl } = await fetchUserItemsByParamsWithMetadata(
      workspaceName,
      collectionId,
      catalogPath,
      workspaceToken,
      ORDER_FETCH_LIMIT_PER_COLLECTION,
    )

    // Filter for order items and extract order data
    const orderItems = items.filter(isOrderItem)
    const orders = orderItems.map((item) => extractOrderData(item, workspaceName, collectionTitle))

    return {
      orders,
      numMatched,
      hasMore,
      nextUrl,
    }
  } catch (error) {
    // Return empty result on error to allow other collections to continue processing
    return {
      orders: [],
      numMatched: null,
      hasMore: false,
      nextUrl: null,
    }
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
