import React, { useEffect, useContext, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { Collection } from '@/types'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useWorkspaceToken } from '@/hooks/useWorkspaceToken'
import {
  fetchCollections,
  fetchUserCollections,
  fetchJobCollection,
} from '@/services/collectionService'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { catalogs } from '@/constants/catalogs'
import { useSelector } from '@xstate/store/react'
import { parseCollectionPath } from '@/library/catalogUtils'
import dataFinderStore from './useFinderStore'
import { parsePermalinkParams } from '@/utils/permalink'
import {
  restoreFromPermalinkMultiCollection,
  restoreFromPermalinkSingleCollection,
} from './permalinkRestore'
import { isCollectionPurchasable } from '@/library/purchasabilityConfig'

import styles from './DataFinderPage.module.scss'

export const DataFinderPage: React.FC = () => {
  const { isAuthenticating, isAuthenticated, currentWorkspace, token, userInfo } =
    useContext(AuthenticationContext)
  // Use catch-all route parameter '*' to capture full path
  const params = useParams<{ '*': string }>()
  const collectionPath = params['*'] ?? ''
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const permalinkRestoreDoneRef = useRef(false)

  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const collectionRender = useSelector(dataFinderStore, (state) => state.context.collectionRender)

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

  const { data: workspaceTokensData } = useWorkspaceToken(currentWorkspace, token, userInfo?.sub)

  const userCollectionQuery = useQuery({
    queryKey: ['UserCollections', currentWorkspace],
    queryFn: () => {
      return fetchUserCollections(currentWorkspace!, workspaceTokensData!.access)
    },
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!workspaceTokensData,
  })

  // Parse the collection path to determine type (memoized to prevent infinite loops)
  const parsedPath = useMemo(
    () => (collectionPath ? parseCollectionPath(collectionPath) : null),
    [collectionPath],
  )

  const collectionId = parsedPath?.collectionId

  // Determine workspace to use: from URL if present, otherwise currentWorkspace
  const targetWorkspace = parsedPath?.workspace ?? currentWorkspace

  // Fetch workspace tokens for job collections (use workspace from URL if available)
  const jobWorkspaceTokensQuery = useWorkspaceToken(
    targetWorkspace,
    token,
    userInfo?.sub,
    !!parsedPath && parsedPath.type === 'job' && isAuthenticated,
  )

  // Fetch job collection if needed
  const jobCollectionQuery = useQuery({
    queryKey: ['JobCollection', targetWorkspace, parsedPath?.jobPath],
    queryFn: () => {
      if (!parsedPath?.jobPath || !targetWorkspace || !jobWorkspaceTokensQuery.data?.access) {
        return null
      }
      return fetchJobCollection(
        targetWorkspace,
        parsedPath.jobPath,
        jobWorkspaceTokensQuery.data.access,
      )
    },
    refetchOnWindowFocus: false,
    enabled:
      !!parsedPath &&
      parsedPath.type === 'job' &&
      !!targetWorkspace &&
      !!jobWorkspaceTokensQuery.data &&
      isAuthenticated,
  })

  const findCollectionById = (
    collections: Collection[] | undefined,
    id: string | undefined,
  ): Collection | undefined => {
    return collections?.find((col) => col.id === id)
  }

  // Collection selection and redirection if not found
  useEffect(() => {
    if (!collectionPath || isAuthenticating) return

    if (!parsedPath) {
      // Invalid path, redirect to home
      void navigate('/')
      return
    }

    if (parsedPath.type === 'job') {
      // Handle job collections
      if (isAuthenticated && jobCollectionQuery.isFetched) {
        const jobCollection = jobCollectionQuery.data
        if (jobCollection) {
          dataFinderStore.send({
            type: 'setCollection',
            collection: jobCollection,
            isUserCollection: false, // Job collections are not user collections
          })
          dataFinderStore.send({ type: 'setIsUserCollection', isUserCollection: false })
          return
        }
        // Job collection not found, redirect
        void navigate('/')
        return
      }
      // Still loading job collection
      return
    }

    if (parsedPath.type === 'purchased') {
      // Handle purchased collections (existing logic)
      if (isAuthenticated && userCollectionQuery.isFetched) {
        const foundUser = findCollectionById(userCollectionQuery.data, parsedPath.collectionId)
        if (foundUser) {
          dataFinderStore.send({
            type: 'setCollection',
            collection: foundUser,
            isUserCollection: true,
          })
          dataFinderStore.send({ type: 'setIsUserCollection', isUserCollection: true })
          return
        }
        // Collection not found, redirect
        void navigate('/')
        return
      }
      // Still loading user collections
      return
    }

    // Handle public collections (existing logic)
    if (parsedPath.type === 'public') {
      if (collectionQueries.isFetched) {
        const foundPublic = findCollectionById(collectionQueries.data, parsedPath.collectionId)
        if (foundPublic) {
          dataFinderStore.send({
            type: 'setCollection',
            collection: foundPublic,
            isUserCollection: false,
          })
          dataFinderStore.send({ type: 'setIsUserCollection', isUserCollection: false })
          return
        }
        // Collection not found, redirect
        void navigate('/')
        return
      }
      // Still loading public collections
      return
    }
  }, [
    collectionPath,
    parsedPath,
    isAuthenticating,
    isAuthenticated,
    collectionQueries.data,
    collectionQueries.isFetched,
    userCollectionQuery.data,
    userCollectionQuery.isFetched,
    jobCollectionQuery.data,
    jobCollectionQuery.isFetched,
    navigate,
  ])

  // Remove AOI from local storage on mount
  useEffect(() => {
    localStorage.removeItem('aoi')
  }, [])

  // Auto-pin item from orders dashboard if stored in localStorage
  useEffect(() => {
    // Only proceed if collection is loaded
    if (!collection) return

    const storedItemData = localStorage.getItem('itemToPin')
    if (!storedItemData) return

    try {
      const { item, collectionTitle, workspace } = JSON.parse(storedItemData)

      // CRITICAL: Verify workspace matches before proceeding
      if (currentWorkspace !== workspace) {
        return
      }

      // CRITICAL: Verify collection ID matches the item's collection
      const itemCollectionId = item?.collection
      if (collection.id !== itemCollectionId) {
        return
      }

      // CRITICAL: Ensure collection render is available
      if (!collectionRender) {
        return
      }

      // Pin the item to the map
      dataFinderStore.send({
        type: 'addPinnedItem',
        item: item,
        collectionRender,
        isLicenseProprietary: isCollectionPurchasable(collection),
        isUserCollection: true,
        collectionName: collectionTitle,
        collection: collection,
      })

      // Zoom to the item's bounding box
      // Wait for map instance to be available before zooming
      const attemptZoom = () => {
        const mapInstance = dataFinderStore.getSnapshot().context.mapInstance
        if (mapInstance) {
          dataFinderStore.send({
            type: 'zoomToItem',
            item: item,
          })
        } else {
          // Retry after 100ms if map instance not ready
          setTimeout(attemptZoom, 100)
        }
      }

      // Start attempting zoom after a short delay
      setTimeout(attemptZoom, 500)

      // Clear the stored item
      localStorage.removeItem('itemToPin')
    } catch (error) {
      // If parsing fails, just clear the stored item
      // eslint-disable-next-line no-console
      console.error('[DataFinderPage] Error processing itemToPin:', error)
      localStorage.removeItem('itemToPin')
    }
  }, [collection, currentWorkspace, collectionRender])

  // Restore from permalink URL: pin item(s) from URL as the only pinned items, apply bounds
  useEffect(() => {
    if (!collection || !collectionId) return

    const { itemIds, itemsByCollection, bounds } = parsePermalinkParams(searchParams)
    const useMultiCollection = itemsByCollection.length > 0
    const hasItemsToRestore = useMultiCollection || itemIds.length > 0

    if (permalinkRestoreDoneRef.current) return
    if (!hasItemsToRestore && !bounds) return

    const isUserCollection = collectionId.startsWith('my-')
    if (hasItemsToRestore && isUserCollection && !workspaceTokensData?.access) return

    if (bounds) {
      dataFinderStore.send({ type: 'setInitialBounds', bounds })
    }

    if (useMultiCollection) {
      const needsUserCollections = itemsByCollection.some((r) => r.collectionId.startsWith('my-'))
      if (needsUserCollections && !userCollectionQuery.isFetched) return
      if (!collectionQueries.isFetched) return

      localStorage.setItem('openPinnedItemsTab', '1')
      dataFinderStore.send({ type: 'clearAllPinnedItems' })

      const publicCollections = collectionQueries.data ?? []
      const userCollections = userCollectionQuery.data ?? []
      const resolveCollection = (cid: string) => {
        if (cid.startsWith('my-')) {
          const found = findCollectionById(userCollections, cid.replace(/^my-/, ''))
          return found ? { collection: found, isUserCollection: true } : null
        }
        const found = findCollectionById(publicCollections, cid)
        return found ? { collection: found, isUserCollection: false } : null
      }

      void restoreFromPermalinkMultiCollection({
        itemsByCollection,
        resolveCollection,
        workspaceTokenForUser: workspaceTokensData?.access,
      }).then(() => {
        permalinkRestoreDoneRef.current = true
      })
      return
    }

    if (itemIds.length > 0) {
      const collectionUrl = collection.links.find((l) => l.rel === 'self')?.href
      if (!collectionUrl || !collectionRender) {
        permalinkRestoreDoneRef.current = true
        return
      }

      localStorage.setItem('openPinnedItemsTab', '1')
      dataFinderStore.send({ type: 'clearAllPinnedItems' })

      void restoreFromPermalinkSingleCollection({
        itemIds,
        collection,
        collectionRender,
        isUserCollection,
        workspaceTokenForUser: workspaceTokensData?.access,
      }).then(() => {
        permalinkRestoreDoneRef.current = true
      })
    } else {
      permalinkRestoreDoneRef.current = true
    }
  }, [
    collection,
    collectionId,
    collectionRender,
    searchParams,
    workspaceTokensData?.access,
    collectionQueries.data,
    collectionQueries.isFetched,
    userCollectionQuery.data,
    userCollectionQuery.isFetched,
  ])

  return (
    <Box height="var(--content-height)" position="relative">
      <Box className={styles.floatingContainer}>
        <SidePanel collection={collection ?? undefined} />
      </Box>
      <Box height="100%">
        <Map />
      </Box>
    </Box>
  )
}
