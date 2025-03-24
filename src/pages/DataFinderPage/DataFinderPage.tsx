import React, { useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { Box } from '@radix-ui/themes'
import { Map } from '@/components/Map/Map'
import { SidePanel } from '@/components/SidePanel/SidePanel'
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchCollections, fetchUserCollections } from '@/services/collectionService'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { catalogs } from '@/constants/catalogs'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from './useFinderStore'

import styles from './DataFinderPage.module.scss'

export const DataFinderPage: React.FC = () => {
  const { isAuthenticating, isAuthenticated, workspaceUserName } = useContext(AuthenticationContext)
  const { collectionId } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const collection = useSelector(dataFinderStore, (state) => state.context.collection)

  const collectionQueries = useQueries({
    queries: catalogs.map((catalog) => ({
      queryKey: ['Collections', catalog],
      queryFn: () => fetchCollections(catalog),
    })),
    combine: (results) => ({
      isFetched: results.every((result) => result.isFetched),
      data: results.flatMap((result) => result.data ?? []),
    }),
  })

  const userCollectionQuery = useQuery({
    queryKey: ['UserCollections', workspaceUserName],
    queryFn: () => fetchUserCollections(workspaceUserName!),
    refetchOnWindowFocus: false,
    enabled: !!workspaceUserName,
  })

  // Try to find the collection in the public collections as soon as they are
  // fetched
  useEffect(() => {
    if (!collectionQueries.isFetched) return

    const foundPublicCollection = collectionQueries.data.find((col) => col.id === collectionId)

    if (foundPublicCollection) {
      dataFinderStore.send({
        type: 'setCollection',
        collection: foundPublicCollection,
      })
    }
  }, [collectionId, isAuthenticating, collectionQueries])

  // Once the user collections are fetched, try to find the collection in the
  // user collections and set it as the active collection
  useEffect(() => {
    if (!isAuthenticated || !userCollectionQuery.isFetched || !collectionId) return

    const foundUserCollection = userCollectionQuery.data?.find((col) => col.id === collectionId)

    if (foundUserCollection) {
      dataFinderStore.send({
        type: 'setCollection',
        collection: foundUserCollection,
      })
      dataFinderStore.send({ type: 'setIsUserCollection', isUserCollection: true })
    }
  }, [collectionId, isAuthenticated, userCollectionQuery])

  // If the collection is not found in the public or user collections, navigate
  // to the home page
  useEffect(() => {
    if (
      isAuthenticating ||
      !collectionId ||
      !collectionQueries.isFetched ||
      (isAuthenticated && !userCollectionQuery.isFetched)
    )
      return

    const allCollections = [...collectionQueries.data, ...(userCollectionQuery.data ?? [])]
    const found = allCollections.find((col) => col.id === collectionId)
    if (!found) {
      navigate('/')
    }
  }, [
    collectionId,
    collectionQueries,
    userCollectionQuery,
    isAuthenticated,
    isAuthenticating,
    navigate,
  ])

  // Remove AOI from local storage on mount
  useEffect(() => {
    localStorage.removeItem('aoi')
  }, [])

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
