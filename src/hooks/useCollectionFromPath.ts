import { useContext, useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useWorkspaceToken } from '@/hooks/useWorkspaceToken'
import {
  fetchCollections,
  fetchUserCollections,
  fetchJobCollection,
} from '@/services/collectionService'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { catalogs } from '@/constants/catalogs'
import { findCollectionById, parseCollectionPath } from '@/library/catalogUtils'
import type { Collection } from '@/types'

export type CollectionFromPathStatus =
  | 'loading'
  | 'found'
  | 'not-found'
  | 'needs-auth'
  | 'no-workspace'
  /** The workspace token couldn't be fetched, e.g. the user isn't a member of the workspace. */
  | 'no-access'

interface UseCollectionFromPathOptions {
  /** Workspace to resolve "my-" collections in, instead of the current workspace. */
  workspace?: string
}

/**
 * Resolves a collection from a finder-style route path ("sentinel2_ard", "my-<id>",
 * "<workspace>/processing-results/<jobPath>") and reports the outcome as a status,
 * so each page decides what to do when it isn't found.
 */
export const useCollectionFromPath = (
  collectionPath: string,
  options: UseCollectionFromPathOptions = {},
) => {
  const { isAuthenticating, isAuthenticated, currentWorkspace, token, userInfo } =
    useContext(AuthenticationContext)

  const collectionQueries = useQueries({
    queries: catalogs.map((catalog) => ({
      queryKey: ['Collections', catalog],
      queryFn: () =>
        fetchCollections(catalog, catalog === 'public/catalogs/ceda-stac-catalogue' ? 50 : 20),
    })),
    combine: (results) => ({
      isFetched: results.every((result) => result.isFetched),
      data: results.flatMap((result) => result.data ?? []),
    }),
  })

  const userWorkspace = options.workspace ?? currentWorkspace

  const userWorkspaceTokensQuery = useWorkspaceToken(userWorkspace, token, userInfo?.sub)
  const workspaceTokensData = userWorkspaceTokensQuery.data

  const userCollectionQuery = useQuery({
    queryKey: ['UserCollections', userWorkspace],
    queryFn: () => {
      return fetchUserCollections(userWorkspace!, workspaceTokensData!.access)
    },
    refetchOnWindowFocus: false,
    enabled: !!userWorkspace && !!workspaceTokensData,
  })

  // Parse the collection path to determine type (memoized to prevent infinite loops)
  const parsedPath = useMemo(
    () => (collectionPath ? parseCollectionPath(collectionPath) : null),
    [collectionPath],
  )

  // Determine workspace to use: from URL if present, otherwise currentWorkspace
  const jobWorkspace = parsedPath?.workspace ?? currentWorkspace

  // Fetch workspace tokens for job collections (use workspace from URL if available)
  const jobWorkspaceTokensQuery = useWorkspaceToken(
    jobWorkspace,
    token,
    userInfo?.sub,
    !!parsedPath && parsedPath.type === 'job' && isAuthenticated,
  )

  // Fetch job collection if needed
  const jobCollectionQuery = useQuery({
    queryKey: ['JobCollection', jobWorkspace, parsedPath?.jobPath],
    queryFn: () => {
      if (!parsedPath?.jobPath || !jobWorkspace || !jobWorkspaceTokensQuery.data?.access) {
        return null
      }
      return fetchJobCollection(
        jobWorkspace,
        parsedPath.jobPath,
        jobWorkspaceTokensQuery.data.access,
      )
    },
    refetchOnWindowFocus: false,
    enabled:
      !!parsedPath &&
      parsedPath.type === 'job' &&
      !!jobWorkspace &&
      !!jobWorkspaceTokensQuery.data &&
      isAuthenticated,
  })

  const resolved = useMemo((): {
    status: CollectionFromPathStatus
    collection?: Collection
  } => {
    if (!parsedPath || isAuthenticating) return { status: 'loading' }

    if (parsedPath.type === 'public') {
      if (!collectionQueries.isFetched) return { status: 'loading' }
      const found = findCollectionById(collectionQueries.data, parsedPath.collectionId)
      return found ? { status: 'found', collection: found } : { status: 'not-found' }
    }

    if (!isAuthenticated) return { status: 'needs-auth' }

    if (parsedPath.type === 'job') {
      if (!jobWorkspace) return { status: 'no-workspace' }
      if (jobWorkspaceTokensQuery.isError) return { status: 'no-access' }
      if (!jobCollectionQuery.isFetched) return { status: 'loading' }
      const found = jobCollectionQuery.data
      return found ? { status: 'found', collection: found } : { status: 'not-found' }
    }

    if (!userWorkspace) return { status: 'no-workspace' }
    if (userWorkspaceTokensQuery.isError) return { status: 'no-access' }
    if (!userCollectionQuery.isFetched) return { status: 'loading' }
    const found = findCollectionById(userCollectionQuery.data, parsedPath.collectionId)
    return found ? { status: 'found', collection: found } : { status: 'not-found' }
  }, [
    parsedPath,
    isAuthenticating,
    isAuthenticated,
    collectionQueries.data,
    collectionQueries.isFetched,
    jobWorkspace,
    jobWorkspaceTokensQuery.isError,
    jobCollectionQuery.data,
    jobCollectionQuery.isFetched,
    userWorkspace,
    userWorkspaceTokensQuery.isError,
    userCollectionQuery.data,
    userCollectionQuery.isFetched,
  ])

  const isUserCollection = parsedPath?.type === 'purchased'
  const workspace = parsedPath?.type === 'job' ? jobWorkspace : userWorkspace
  const workspaceToken =
    parsedPath?.type === 'job'
      ? jobWorkspaceTokensQuery.data?.access
      : parsedPath?.type === 'purchased'
        ? workspaceTokensData?.access
        : undefined

  return {
    ...resolved,
    parsedPath,
    isUserCollection,
    workspace: workspace ?? undefined,
    workspaceToken,
    collectionQueries,
    userCollectionQuery,
    workspaceTokensData,
  }
}
