import { Collection, Item } from '@/types'

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

export const findCollectionById = (
  collections: Collection[] | undefined,
  id: string | undefined,
): Collection | undefined => {
  return collections?.find((col) => col.id === id)
}

/**
 * Generates the route path for a collection (the part after "/finder/"), based on its type.
 * @param collection - The collection object
 * @param jobPath - Optional job path for job collections (extracted from collection links if not provided)
 * @returns The collection route path, e.g. "sentinel2_ard", "my-SkySatCollect" or "{workspace}/processing-results/..."
 */
export const getCollectionRoutePath = (collection: Collection, jobPath?: string): string => {
  if (collection.isJobCollection) {
    // Extract workspace from collection
    const workspace = extractWorkspaceFromCollection(collection)

    // Extract job path from collection links if not provided
    if (!jobPath) {
      const selfLink = collection.links?.find((link) => link.rel === 'self')
      if (selfLink?.href) {
        jobPath = parseProcessingResultsHref(selfLink.href)?.jobPath
      }
    }

    if (jobPath && workspace) {
      return `${workspace}/processing-results/${jobPath}`
    }

    if (jobPath) {
      // Fallback: if workspace not found, use old format (backward compatibility)
      return `processing-results/${jobPath}`
    }

    // Fallback: if we can't extract the path, use collection ID (shouldn't happen)
    return workspace
      ? `${workspace}/processing-results/${collection.id}`
      : `processing-results/${collection.id}`
  }

  if (collection.isUserCollection) {
    return `my-${collection.id}`
  }

  return collection.id
}

/**
 * Generates the finder URL for a collection based on its type.
 * @param collection - The collection object
 * @param jobPath - Optional job path for job collections (extracted from collection links if not provided)
 * @returns The finder URL path
 */
export const getCollectionFinderUrl = (collection: Collection, jobPath?: string): string =>
  `/finder/${getCollectionRoutePath(collection, jobPath)}`

const ITEM_DOWNLOAD_SOURCES = ['purchased', 'saved-set', 'workflow-output'] as const
export type ItemDownloadSource = (typeof ITEM_DOWNLOAD_SOURCES)[number]

interface ItemDownloadUrlParams {
  /** Collection route path, as used after "/finder/". */
  collectionPath: string
  itemId: string
  /** Workspace to resolve "my-" collections in. Ignored for other paths. */
  workspace?: string
  /** Page the link was opened from, for analytics. */
  from?: ItemDownloadSource
}

/**
 * Generates the download page URL for an item. The item id is a query parameter
 * because item ids can contain "/".
 */
export const getItemDownloadUrl = ({
  collectionPath,
  itemId,
  workspace,
  from,
}: ItemDownloadUrlParams): string => {
  const params = new URLSearchParams({ item: itemId })
  if (workspace && collectionPath.startsWith('my-')) {
    params.set('workspace', workspace)
  }
  if (from) {
    params.set('from', from)
  }
  return `/download/${collectionPath}?${params.toString()}`
}

export const parseItemDownloadSearch = (searchParams: URLSearchParams) => {
  const from = searchParams.get('from')
  return {
    itemId: searchParams.get('item') ?? undefined,
    workspace: searchParams.get('workspace') ?? undefined,
    from: ITEM_DOWNLOAD_SOURCES.find((source) => source === from),
  }
}

/**
 * Reads the workspace and job path (as used in finder and download routes) from a workflow
 * output collection href. Accepts both forms:
 * - catalogue API: .../catalogs/user/catalogs/{workspace}/catalogs/processing-results/{jobPath}
 * - static STAC files on the workspace host:
 *   https://{workspace}.<domain>/files/{store}/processing-results/{catalog}/.../{collection}.json
 */
export const parseProcessingResultsHref = (
  href: string,
): { workspace: string; jobPath: string } | undefined => {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return undefined
  }
  const path = url.pathname.replace(/\/$/, '')

  const api = path.match(/\/catalogs\/user\/catalogs\/([^/]+)\/catalogs\/processing-results\/(.+)$/)
  if (api) return { workspace: api[1], jobPath: api[2] }

  const files = path.match(/\/files\/[^/]+\/processing-results\/(.+)\.json$/)
  if (files) {
    const segments = files[1].split('/')
    const collectionId = segments.pop()
    if (!collectionId || segments.length === 0) return undefined
    return {
      workspace: url.hostname.split('.')[0],
      jobPath: [...segments.map((s) => `catalogs/${s}`), `collections/${collectionId}`].join('/'),
    }
  }

  return undefined
}

const getWorkflowOutputCollectionPath = (collectionHref: string): string | undefined => {
  const parsed = parseProcessingResultsHref(collectionHref)
  return parsed ? `${parsed.workspace}/processing-results/${parsed.jobPath}` : undefined
}

const getWorkflowOutputCollectionDownloadUrl = (
  collectionHref: string,
  itemId: string,
  from: ItemDownloadSource,
): string | undefined => {
  const collectionPath = getWorkflowOutputCollectionPath(collectionHref)
  return collectionPath ? getItemDownloadUrl({ collectionPath, itemId, from }) : undefined
}

/**
 * The collection href of a workflow output item: its collection link, or the results
 * collection's own href when the item has no collection link. The item's parent link isn't
 * used: for static outputs it's the job catalog, not the collection.
 */
const getWorkflowOutputCollectionHref = (item: Item, resultsCollectionHref?: string) =>
  item.links?.find((link) => link.rel === 'collection')?.href ?? resultsCollectionHref

/** Download page URL for a workflow output item. */
export const getWorkflowOutputDownloadUrl = (
  item: Item,
  resultsCollectionHref?: string,
): string | undefined => {
  const collectionHref = getWorkflowOutputCollectionHref(item, resultsCollectionHref)
  return collectionHref
    ? getWorkflowOutputCollectionDownloadUrl(collectionHref, item.id, 'workflow-output')
    : undefined
}

/**
 * Finder URL for the collection that holds a workflow output item. The finder only lists items
 * in the map view, so the URL also sets the view to `bounds` when given.
 */
export const getWorkflowOutputFinderUrl = (
  item: Item,
  resultsCollectionHref?: string,
  bounds?: number[],
): string | undefined => {
  const collectionHref = getWorkflowOutputCollectionHref(item, resultsCollectionHref)
  const collectionPath = collectionHref && getWorkflowOutputCollectionPath(collectionHref)
  if (!collectionPath) return undefined
  const query = bounds?.length === 4 ? `?bounds=${bounds.join(',')}` : ''
  return `/finder/${collectionPath}${query}`
}

/**
 * Download page URL for a workflow output item from the item's own href: catalogue
 * ".../collections/{collection}/items/{id}" or static ".../{collection}/{id}.json".
 */
export const getWorkflowOutputDownloadUrlFromItemHref = (
  itemHref: string,
  itemId: string,
  from: ItemDownloadSource,
): string | undefined => {
  let url: URL
  try {
    url = new URL(itemHref)
  } catch {
    return undefined
  }
  const path = url.pathname.replace(/\/$/, '')
  url.search = ''
  url.hash = ''
  if (/\/items\/[^/]+$/.test(path)) {
    url.pathname = path.replace(/\/items\/[^/]+$/, '')
  } else if (path.endsWith('.json')) {
    url.pathname = `${path.slice(0, path.lastIndexOf('/'))}.json`
  } else {
    return undefined
  }
  return getWorkflowOutputCollectionDownloadUrl(url.href, itemId, from)
}
