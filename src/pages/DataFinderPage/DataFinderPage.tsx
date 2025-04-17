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
      queryFn: () => fetchCollections(catalog),
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
          dataFinderStore.send({ type: 'setCollection', collection: foundUser })
          dataFinderStore.send({ type: 'setIsUserCollection', isUserCollection: true })
          return
        }
      }
    } else {
      // search only in public collections
      if (collectionQueries.isFetched) {
        const foundPublic = findCollectionById(collectionQueries.data, collectionIdWithoutPrefix)
        if (foundPublic) {
          dataFinderStore.send({ type: 'setCollection', collection: foundPublic })
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
      navigate('/')
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
