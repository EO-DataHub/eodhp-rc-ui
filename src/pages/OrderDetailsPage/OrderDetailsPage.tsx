/* eslint-disable no-console */
import React, { useContext } from 'react'
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
// import { getProductBundleForPlanet } from '@/library/planetMappingUtils'

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { workspaceUserName } = useContext(AuthenticationContext)
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

  console.log({ item })

  const getProviderType = () => {
    if (catalog === 'planet') {
      return 'planet'
    }
    return isOpticalData() ? 'airbus_optical' : 'airbus_sar'
  }

  console.log({ getProviderType: getProviderType() })

  // want to test this with planet but that catalog is broken
  // const getProductBundle = () => {
  //   if (getProviderType() === 'planet') {
  //     return item?.assets ? getProductBundleForPlanet(item.assets) : 'default_bundle'
  //   }
  //   return 'general_use'
  // }
  const placeOrder = async () => {
    if (!item) {
      console.error('No order item found.')
      return
    }

    const testUrl =
      'https://staging.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/catalogs/planet/collections/PSScene/items/20250217_101155_07_24c7'

    // how will coordinates and parameters be passed in ? we are navigating to a new page
    try {
      const response = await purchaseProduct({
        workspace: workspaceUserName,
        datasetUrl: testUrl,
        provider: getProviderType(),
        productBundle: 'analytic_udm2',
        coordinates: [
          [
            [9.6, 57.1],
            [9.6, 57.0],
            [9.8, 56.9],
            [9.8, 57.0],
            [9.6, 57.1],
          ],
        ],
        parameters:
          getProviderType() === 'airbus_sar' ? { polarization: 'HH', resolution: '5m' } : undefined,
      })

      console.log('Order placed successfully:', response)
      alert('Order placed successfully!')
    } catch (error) {
      console.error('Order placement failed:', error)
      alert('Failed to place order.')
    }
  }

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
        </Flex>
        <Flex direction="row" gap="6" className={styles.bodyContainer}>
          <ItemInfo item={item} isOptical={isOpticalData()} />
          <OrderSelections isOptical={isOpticalData()} />
        </Flex>
        <TermsAndConditionsContainer />
        <Flex className={styles.buttonsContainer} direction="row" gap="3">
          <Button className={styles.cancelButton}>Cancel</Button>
          <Button className={styles.purchaseButton} onClick={placeOrder}>
            Place Order
          </Button>
        </Flex>
      </Flex>
    </>
  )
}
