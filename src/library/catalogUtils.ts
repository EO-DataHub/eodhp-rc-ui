import { Collection } from '@/types'

export const extractCatalogPaths = (selectedCollection: Collection): string[] => {
  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )
  if (!parentLink?.href) return []

  const urlParts = new URL(parentLink.href).pathname.match(/\/catalogs\/(.+)/)

  return urlParts && urlParts.length > 1 ? [urlParts[1]] : []
}

export const getCatalog = (selectedCollection: Collection): string => {
  const parentLink = selectedCollection.links?.find(
    (link: { rel: string }) => link.rel === 'parent',
  )
  if (!parentLink?.href) return ''
  return parentLink.href
}

/**
 * Extracts the workspace name from a collection's self link.
 * @param collection - The collection object
 * @returns The workspace name or null if not found
 */
export const extractWorkspaceFromCollection = (collection: Collection): string | null => {
  const selfLink = collection.links?.find((link) => link.rel === 'self')
  if (!selfLink?.href) return null

  // Pattern: /catalogs/user/catalogs/{workspace}/catalogs/processing-results/...
  // or: /catalogs/user/catalogs/{workspace}/catalogs/commercial-data/...
  const match = selfLink.href.match(/\/catalogs\/user\/catalogs\/([^/]+)\//)
  return match?.[1] ?? null
}

export interface ParsedCollectionPath {
  type: 'public' | 'purchased' | 'job'
  collectionId: string
  jobPath?: string
  workspace?: string
}

/**
 * Parses a collection path from the finder URL to determine collection type and extract identifiers.
 * @param path - The path from the finder URL (e.g., "sentinel2_ard", "my-SkySatCollect", or "processing-results/catalogs/minimalist-stac/catalogs/esacci-lst-sentinel3-catalog/collections/esacci-lst-s3b-night-monthly")
 * @returns Parsed collection path information
 */
export const parseCollectionPath = (path: string): ParsedCollectionPath => {
  // Check if it's a job collection
  // New format: {workspace}/processing-results/...
  // Old format: processing-results/... (backward compatibility)
  const workspaceMatch = path.match(/^([^/]+)\/processing-results\/(.+)$/)
  if (workspaceMatch) {
    // New format with workspace
    const workspace = workspaceMatch[1]
    const jobPath = workspaceMatch[2]

    // Extract collection ID (last segment after "collections/")
    const pathParts = jobPath.split('/')
    const collectionsIndex = pathParts.indexOf('collections')
    const collectionId =
      collectionsIndex >= 0 && collectionsIndex < pathParts.length - 1
        ? pathParts[collectionsIndex + 1]
        : pathParts[pathParts.length - 1]

    return {
      type: 'job',
      collectionId,
      jobPath,
      workspace,
    }
  }

  // Check if it's a job collection (old format without workspace - backward compatibility)
  if (path.startsWith('processing-results/')) {
    // Extract the job path (everything after "processing-results/")
    // Format: catalogs/{workflow}/catalogs/{catalog}/collections/{collectionId}
    const jobPath = path.replace(/^processing-results\//, '')

    // Extract collection ID (last segment after "collections/")
    const pathParts = jobPath.split('/')
    const collectionsIndex = pathParts.indexOf('collections')
    const collectionId =
      collectionsIndex >= 0 && collectionsIndex < pathParts.length - 1
        ? pathParts[collectionsIndex + 1]
        : pathParts[pathParts.length - 1]

    return {
      type: 'job',
      collectionId,
      jobPath,
      // workspace is undefined for old format - will fallback to currentWorkspace
    }
  }

  // Check if it's a purchased collection (starts with "my-")
  if (path.startsWith('my-')) {
    const collectionId = path.replace(/^my-/, '')
    return {
      type: 'purchased',
      collectionId,
    }
  }

  // Default to public collection
  return {
    type: 'public',
    collectionId: path,
  }
}

/**
 * Generates the finder URL for a collection based on its type.
 * @param collection - The collection object
 * @param jobPath - Optional job path for job collections (extracted from collection links if not provided)
 * @returns The finder URL path
 */
export const getCollectionFinderUrl = (collection: Collection, jobPath?: string): string => {
  if (collection.isJobCollection) {
    // Extract workspace from collection
    const workspace = extractWorkspaceFromCollection(collection)

    // Extract job path from collection links if not provided
    if (!jobPath) {
      const selfLink = collection.links?.find((link) => link.rel === 'self')
      if (selfLink?.href) {
        // Extract the path after /catalogs/user/catalogs/{workspace}/catalogs/processing-results/
        const match = selfLink.href.match(
          /\/catalogs\/user\/catalogs\/[^/]+\/catalogs\/processing-results\/(.+)/,
        )
        if (match?.[1]) {
          jobPath = match[1]
        }
      }
    }

    if (jobPath && workspace) {
      return `/finder/${workspace}/processing-results/${jobPath}`
    }

    if (jobPath) {
      // Fallback: if workspace not found, use old format (backward compatibility)
      return `/finder/processing-results/${jobPath}`
    }

    // Fallback: if we can't extract the path, use collection ID (shouldn't happen)
    return workspace
      ? `/finder/${workspace}/processing-results/${collection.id}`
      : `/finder/processing-results/${collection.id}`
  }

  if (collection.isUserCollection) {
    return `/finder/my-${collection.id}`
  }

  return `/finder/${collection.id}`
}
