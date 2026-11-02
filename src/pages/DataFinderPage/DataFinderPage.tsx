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
import { fetchItemById } from '@/services/processCatalogueService'
import { isDataFinderTool } from '@/services/notebookVariableResolvers'

import styles from './DataFinderPage.module.scss'

const withToolParam = (params: URLSearchParams, toolId: string | undefined) => {
  const next = new URLSearchParams(params)
  if (toolId) {
    next.set('tool', toolId)
  } else {
    next.delete('tool')
  }
  return next
}

export const DataFinderPage: React.FC = () => {
  const { currentWorkspace } = useContext(AuthenticationContext)
  // Use catch-all route parameter '*' to capture full path
  const params = useParams<{ '*': string }>()
  const collectionPath = params['*'] ?? ''
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const permalinkRestoreDoneRef = useRef(false)
  // The tool id the page opened with; the URL is left alone until its lookup finishes
  const initialToolIdRef = useRef(searchParams.get('tool'))
  // A ref, not state: it only gates the URL sync effect and must not cause a render of its own
  const isToolLookupPendingRef = useRef(false)
  // setSearchParams changes with every URL change, so the mount-only effect reads it from a ref
  const setSearchParamsRef = useRef(setSearchParams)
  setSearchParamsRef.current = setSearchParams

  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const collectionRender = useSelector(dataFinderStore, (state) => state.context.collectionRender)
  const chosenToolId = useSelector(dataFinderStore, (state) => state.context.chosenTool?.id)

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

  // Choose the tool named in the URL, and clear the chosen tool when the Data Finder closes
  useEffect(() => {
    const toolId = initialToolIdRef.current
    let isCancelled = false

    if (toolId) {
      isToolLookupPendingRef.current = true
      void fetchItemById(toolId).then(({ data, notFound }) => {
        if (isCancelled) return
        isToolLookupPendingRef.current = false

        // The user chose a tool from the Tools tab while the lookup ran, so keep their choice
        const toolChosenMeanwhile = dataFinderStore.getSnapshot().context.chosenTool
        if (toolChosenMeanwhile) {
          setSearchParamsRef.current((prev) => withToolParam(prev, toolChosenMeanwhile.id), {
            replace: true,
          })
        } else if (data && isDataFinderTool(data)) {
          dataFinderStore.send({ type: 'chooseTool', tool: data })
        } else if (notFound || data) {
          // A record the Tools tab would not list is treated as unknown
          setSearchParamsRef.current((prev) => withToolParam(prev, undefined), { replace: true })
        }
        // On other failures the parameter stays only until the URL next changes
      })
    }

    return () => {
      isCancelled = true
      dataFinderStore.send({ type: 'clearTool' })
    }
  }, [])

  // Keep the tool parameter in step with the chosen tool, including after a dataset change
  useEffect(() => {
    if (isToolLookupPendingRef.current) return
    if ((searchParams.get('tool') ?? undefined) === chosenToolId) return

    setSearchParams((prev) => withToolParam(prev, chosenToolId), { replace: true })
  }, [chosenToolId, searchParams, setSearchParams])

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
