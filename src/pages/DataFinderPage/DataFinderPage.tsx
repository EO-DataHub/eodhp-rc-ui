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

  useEffect(() => {
    if (isAuthenticating) return

    if (collectionQueries.isFetched && (!isAuthenticated || userCollectionQuery.isFetched)) {
      //Start with all public collections
      let allCollections = collectionQueries.data

      //If the user is authenticated, also add their private collections
      if (isAuthenticated) {
        allCollections = [...allCollections, ...(userCollectionQuery.data ?? [])]
      }

      const foundCollection = allCollections.find((col) => col.id === collectionId)
      if (foundCollection) {
        const isUserCollection = !!userCollectionQuery.data?.some(
          (col) => col.id === foundCollection.id,
        )
        dataFinderStore.send({ type: 'setIsUserCollection', isUserCollection })
        dataFinderStore.send({ type: 'setCollection', collection: foundCollection })
      } else {
        navigate('/')
      }
    }
  }, [
    collectionId,
    navigate,
    collection,
    collectionQueries,
    userCollectionQuery,
    isAuthenticated,
    isAuthenticating,
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
