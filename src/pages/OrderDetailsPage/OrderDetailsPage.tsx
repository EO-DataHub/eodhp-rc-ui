/* eslint-disable no-console */
import React, { useContext, useState } from 'react'
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
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { purchaseProduct } from '@/services/PurchaseProductService'

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { workspaceUserName } = useContext(AuthenticationContext)
  const storedCollection = localStorage.getItem('selectedCollection')
  const selectedCollection = storedCollection ? JSON.parse(storedCollection) : null
  const isOpticalData = (): boolean => !selectedCollection?.stac_extensions?.[0]?.includes('/sar/')
  const catalog = getCatalog(selectedCollection)

  const [orderSelections, setOrderSelections] = useState<Record<string, string>>({})
  const [orderStatus, setOrderStatus] = useState<'pending' | 'success' | 'error' | null>(null)

  const getProviderType = (): 'airbus_optical' | 'airbus_sar' | 'planet' => {
    if (catalog === 'planet') {
      return 'planet'
    }
    return isOpticalData() ? 'airbus_optical' : 'airbus_sar'
  }

  const handleSelectionsChange = (selections: Record<string, string>) => {
    setOrderSelections(selections)
  }

  const placeOrder = async () => {
    if (!item) {
      return
    }

    try {
      const providerType = getProviderType()

      const requestBody = {
        workspace: workspaceUserName,
        datasetUrl: item.links[0].href,
        provider: providerType,
        productBundle: orderSelections.productBundle,
        // Todo: pass in coordinates from maps page
        coordinates:
          providerType !== 'airbus_sar' ? selectedCollection?.geometry ?? undefined : undefined,
        parameters:
          providerType === 'airbus_sar'
            ? {
                orbit: orderSelections.orbit,
                resolution_variant: orderSelections.resolutionVariant,
                projection: orderSelections.projection,
              }
            : undefined,
        country: orderSelections.country,
      }

      console.log({ requestBody })

      const response = await purchaseProduct(requestBody)

      setOrderStatus('success')
      console.log('Order placed:', response)
    } catch (error) {
      setOrderStatus('error')
      console.error('Error placing order:', error)
    }
  }

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

  console.log({ item })

  if (!orderId) return <Flex>Error: No order ID provided.</Flex>

  if (isLoading) return <Flex className={styles.status}>Loading...</Flex>
  if (error) return <Flex className={styles.status}>Error loading items.</Flex>
  if (!item) return <Flex className={styles.status}>No order item found.</Flex>
  if (orderStatus === 'success')
    return <Flex className={styles.status}>Order placed successfully!</Flex>
  if (orderStatus === 'error') return <Flex className={styles.status}>Error placing order.</Flex>

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
        </Flex>
        <Flex direction="row" gap="6" className={styles.bodyContainer}>
          <ItemInfo item={item} isOptical={isOpticalData()} />
          <OrderSelections
            provider={getProviderType()}
            onSelectionChange={handleSelectionsChange}
          />
        </Flex>
        <TermsAndConditionsContainer />
        <Flex className={styles.buttonsContainer} direction="row" gap="3">
          <Button className={styles.cancelButton}>Cancel</Button>
          <Button
            className={styles.purchaseButton}
            onClick={placeOrder}
            disabled={!orderSelections.productBundle}
          >
            Place Order
          </Button>
        </Flex>
      </Flex>
    </>
  )
}
