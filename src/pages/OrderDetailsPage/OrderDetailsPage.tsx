import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchItems } from '@/services/ItemService'
import { fetchCollections } from '@/services/collectionService'
import { Item, Collection } from '@/types'
import { Flex, Text, Kbd, Button, Link } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import { OrderSelections } from './OrderSelections'
import { TermsAndConditionsContainer } from './TermsAndConditions'
import { ItemInfo } from './ItemInfo'
import { ArrowLeftIcon } from '@radix-ui/react-icons'

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const MAX_TOTAL_ITEMS = 100

  const navigate = useNavigate()

  const {
    data: items,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['Items'],
    queryFn: () => fetchItems({ limit: MAX_TOTAL_ITEMS + 1, bbox: null }),
    refetchOnWindowFocus: false,
  })

  const item = items?.find((itm: Item) => itm.id === orderId)

  const catalogs = ['airbus', 'ceda-stac-catalogue', 'planet']

  const queries = useQueries({
    queries: catalogs.map((catalog, index) => ({
      queryKey: ['Collections', index],
      queryFn: () => fetchCollections(catalog),
    })),
  })

  const mergedCollections: Collection[] = queries.flatMap(
    (query: { data?: Collection[] }) => query.data ?? [],
  )

  // the target collection will be based on user selection input in the future
  const targetCollectionId = 'sentinel2_ard'
  const targetCollection = mergedCollections?.find((col) => col.id === targetCollectionId)
  const isOpticalData = (): boolean => !targetCollection?.stac_extensions?.[0]?.includes('/sar/')

  if (isLoading) return <Flex>Loading...</Flex>
  if (error) return <Flex>Error loading items.</Flex>
  if (!item) return <Flex>No order item found.</Flex>

  return (
    <>
      <Link className={styles.link} onClick={() => navigate(-1)}>
        <Flex gap="2" className={styles.backButton}>
          <ArrowLeftIcon />
          <Text>Back</Text>
        </Flex>
      </Link>
      <Flex direction="column" height="100vh" className={styles.mainContainer}>
        <Flex direction="column" gap="2">
          <Kbd className={styles.tag}>Provider Name</Kbd>
          <Text size="3" weight="bold">
            {item.collection}: {item.id}
          </Text>
          <Text size="2">Contract ID: text</Text>
        </Flex>
        <Flex direction="row" gap="6" className={styles.bodyContainer}>
          <ItemInfo item={item} />
          <OrderSelections isOptical={isOpticalData()} />
        </Flex>
        <TermsAndConditionsContainer />
        <Flex className={styles.buttonsContainer} direction="row" gap="3">
          <Button className={styles.cancelButton}>Cancel</Button>
          <Button className={styles.purchaseButton}>Place Order</Button>
        </Flex>
      </Flex>
    </>
  )
}
