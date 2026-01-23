import React, { useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { Collection } from '@/types'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchCollections, fetchUserCollections } from '@/services/collectionService'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { catalogs } from '@/constants/catalogs'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from './useFinderStore'

import styles from './DataFinderPage.module.scss'

export const DataFinderPage: React.FC = () => {
  const { isAuthenticating, isAuthenticated, currentWorkspace, token } =
    useContext(AuthenticationContext)
  const { collectionId } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const collection = useSelector(dataFinderStore, (state) => state.context.collection)

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

  const { data: workspaceTokensData } = useQuery({
    queryKey: ['WorkspaceTokens', currentWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!token,
  })

  const userCollectionQuery = useQuery({
    queryKey: ['UserCollections', currentWorkspace],
    queryFn: () => fetchUserCollections(currentWorkspace!, workspaceTokensData!.access),
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!workspaceTokensData,
  })

  const findCollectionById = (
    collections: Collection[] | undefined,
    id: string | undefined,
  ): Collection | undefined => {
    return collections?.find((col) => col.id === id)
  }

  // Collection selection and redirection if not found
  useEffect(() => {
    if (!collectionId || isAuthenticating) return

    const isUserCollectionId = collectionId.startsWith('my-')
    const collectionIdWithoutPrefix = isUserCollectionId
      ? collectionId.replace(/^my-/, '')
      : collectionId

    if (isUserCollectionId) {
      // search only in user collections
      if (isAuthenticated && userCollectionQuery.isFetched) {
        const foundUser = findCollectionById(userCollectionQuery.data, collectionIdWithoutPrefix)
        if (foundUser) {
          dataFinderStore.send({
            type: 'setCollection',
            collection: foundUser,
            isUserCollection: true,
          })
          dataFinderStore.send({ type: 'setIsUserCollection', isUserCollection: true })
          return
        }
      }
    } else {
      // search only in public collections
      if (collectionQueries.isFetched) {
        const foundPublic = findCollectionById(collectionQueries.data, collectionIdWithoutPrefix)
        if (foundPublic) {
          dataFinderStore.send({
            type: 'setCollection',
            collection: foundPublic,
            isUserCollection: false,
          })
          dataFinderStore.send({ type: 'setIsUserCollection', isUserCollection: false })
          return
        }
      }
    }

    // redirect if collection not found
    const allFetched = isUserCollectionId
      ? userCollectionQuery.isFetched
      : collectionQueries.isFetched

    if (allFetched) {
      void navigate('/')
    }
  }, [
    collectionId,
    isAuthenticating,
    isAuthenticated,
    collectionQueries.data,
    collectionQueries.isFetched,
    userCollectionQuery.data,
    userCollectionQuery.isFetched,
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
      const { item, collectionTitle } = JSON.parse(storedItemData)

      // Create a render config for the thumbnail
      const thumbnailRender = {
        id: 'thumbnail',
        title: 'Thumbnail',
        assets: ['thumbnail'],
        quicklook_georeference: 'bbox' as const,
      }

      // Pin the item to the map
      dataFinderStore.send({
        type: 'addPinnedItem',
        item: item,
        collectionRender: thumbnailRender,
        isLicenseProprietary: collection.license === 'proprietary',
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
      localStorage.removeItem('itemToPin')
    }
  }, [collection])

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
