import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchItems } from '@/services/ItemService'
import { fetchCollections } from '@/services/collectionService'
import { Item, Collection } from '@/types'
import { Flex, Text, Kbd, Button } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import DefaultItemThumbnail from '../../../public/default-item-thumbnail.jpg'
import { OrderSelections } from './OrderSelections'
import { TermsAndConditionsContainer } from './TermsAndConditions'

interface ItemInfoProps {
  item: Item
}

const ItemInfo: React.FC<ItemInfoProps> = ({ item }) => {
  return (
    <Flex gap="2" className={styles.itemInfoContainer}>
      <Flex>
        <img
          src={item.assets?.thumbnail?.href || DefaultItemThumbnail}
          className={styles.thumbnail}
        />
      </Flex>
      <Flex direction="column" gap="0.5">
        <Text>Item Name</Text>
        <Text>Area</Text>
        <Text>Date: {new Date(item.properties.datetime).toLocaleString()}</Text>
        <Text>Data Source</Text>
        <Text>Item Type</Text>
        <Text>Cloud Cover</Text>
        <Text>Look Angle</Text>
        <Text>Heading</Text>
      </Flex>
    </Flex>
  )
}

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const MAX_TOTAL_ITEMS = 100

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

  const { data: collectionsData } = useQuery({
    queryKey: ['Collections'],
    queryFn: fetchCollections,
    refetchOnWindowFocus: false,
    enabled: true,
  })

  const collections: Collection[] = collectionsData ?? []

  // the target collection will be based on user selection input in the future
  const targetCollectionId = 'sentinel2_ard'
  const targetCollection = collections?.find((col) => col.id === targetCollectionId)
  const isOpticalData = (): boolean => !targetCollection?.stac_extensions?.[0].includes('/sar/')

  if (isLoading) return <Flex>Loading...</Flex>
  if (error) return <Flex>Error loading items.</Flex>
  if (!item) return <Flex>No order item found.</Flex>

  return (
    <Flex direction="column" height="100vh" className={styles.mainContainer}>
      <Flex direction="column" gap="2">
        <Kbd className={styles.tag}>Provider Name</Kbd>
        <Text size="3" weight="bold">
          {item.collection}: {item.id}
        </Text>
        <Text size="2">Contract ID: text</Text>
      </Flex>
      <Flex direction="row" gap="4" className={styles.bodyContainer}>
        <ItemInfo item={item} />
        <OrderSelections isOptical={isOpticalData()} />
      </Flex>
      <TermsAndConditionsContainer />
      <Flex className={styles.buttonsContainer} direction="row" gap="3">
        <Button className={styles.cancelButton}>Cancel</Button>
        <Button className={styles.purchaseButton}>Place Order</Button>
      </Flex>
    </Flex>
  )
}
