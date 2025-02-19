import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchItem } from '@/services/ItemService'
import { Flex, Text, Kbd, Button, Link } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import { OrderSelections } from './OrderSelections'
import { TermsAndConditionsContainer } from './TermsAndConditions'
import { ItemInfo } from './ItemInfo'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { getCatalog } from '@/library/catalogUtils'

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()

  const navigate = useNavigate()
  const storedCollection = localStorage.getItem('selectedCollection')
  const selectedCollection = storedCollection ? JSON.parse(storedCollection) : null
  const isOpticalData = (): boolean => !selectedCollection?.stac_extensions?.[0]?.includes('/sar/')
  const catalog = getCatalog(selectedCollection)

  const {
    data: item,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['Items', catalog, selectedCollection?.id, orderId],
    queryFn: () =>
      fetchItem({
        catalog: catalog,
        collection: selectedCollection?.id,
        item: orderId,
      }),
    refetchOnWindowFocus: false,
    enabled: !!orderId,
  })

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
          <ItemInfo item={item} isOptical={isOpticalData()} />
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
