import React, { useEffect, useContext, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { useCollectionFromPath } from '@/hooks/useCollectionFromPath'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useSelector } from '@xstate/store/react'
import { findCollectionById } from '@/library/catalogUtils'
import dataFinderStore from './useFinderStore'
import { parsePermalinkParams } from '@/utils/permalink'
import {
  restoreFromPermalinkMultiCollection,
  restoreFromPermalinkSingleCollection,
} from './permalinkRestore'
import { isCollectionPurchasable } from '@/library/purchasabilityConfig'

import styles from './DataFinderPage.module.scss'
// import { sortFeatures } from '@/library/geometryUtils.ts'

export const DataFinderPage: React.FC = () => {
  const { currentWorkspace } = useContext(AuthenticationContext)
  // Use catch-all route parameter '*' to capture full path
  const params = useParams<{ '*': string }>()
  const collectionPath = params['*'] ?? ''
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const permalinkRestoreDoneRef = useRef(false)

  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const collectionRender = useSelector(dataFinderStore, (state) => state.context.collectionRender)

  const {
    status: collectionStatus,
    collection: resolvedCollection,
    isUserCollection: isResolvedUserCollection,
    parsedPath,
    collectionQueries,
    userCollectionQuery,
    workspaceTokensData,
  } = useCollectionFromPath(collectionPath)

  const collectionId = parsedPath?.collectionId

  // Collection selection and redirection if not found
  useEffect(() => {
    if (!collectionPath) return

    if (collectionStatus === 'found' && resolvedCollection) {
      dataFinderStore.send({
        type: 'setCollection',
        collection: resolvedCollection,
        isUserCollection: isResolvedUserCollection,
      })
      dataFinderStore.send({
        type: 'setIsUserCollection',
        isUserCollection: isResolvedUserCollection,
      })
      return
    }

    if (collectionStatus === 'not-found') {
      void navigate('/')
    }
    // Otherwise still loading, or waiting for sign-in
  }, [collectionPath, collectionStatus, resolvedCollection, isResolvedUserCollection, navigate])

  // Sort the items based on a fitness score.
  // useEffect(() => {
  //   setSortedItems(
  //     sortFeatures(mapBounds, aoi, itemList, {
  //       distanceBias: 1.0,
  //       areaBias: 0.1,
  //       aspectBias: 1.0,
  //       temporalBias: 100.0,
  //     }),
  //   )
  // }, [mapBounds, aoi, itemList])

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
