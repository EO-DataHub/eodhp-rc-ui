import React, { useContext, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
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
  const isOpticalData = !selectedCollection?.stac_extensions?.[0]?.includes('/sar/')
  const catalog = getCatalog(selectedCollection)

  const [orderSelections, setOrderSelections] = useState<Record<string, string>>({})
  const [orderStatus, setOrderStatus] = useState<'pending' | 'success' | 'error' | null>(null)

  const getProviderType = (): 'airbus_optical' | 'airbus_sar' | 'planet' => {
    if (catalog === 'planet') {
      return 'planet'
    }
    return isOpticalData ? 'airbus_optical' : 'airbus_sar'
  }

  const handleSelectionsChange = (selections: Record<string, string>) => {
    setOrderSelections(selections)
  }

  const mutation = useMutation({
    mutationFn: purchaseProduct,
    onSuccess: () => {
      setOrderStatus('success')
    },
    onError: () => {
      setOrderStatus('error')
    },
  })

  const placeOrder = () => {
    if (!item) return

    const providerType = getProviderType()

    const storedAoi = localStorage.getItem('aoi')
    const aoiData = storedAoi ? JSON.parse(storedAoi) : null
    const aoiCoordinates = aoiData?.geometry?.coordinates

    const requestBody = {
      workspace: workspaceUserName,
      datasetUrl: item.links[0].href,
      provider: providerType,
      productBundle: orderSelections.productBundle,
      coordinates: providerType !== 'airbus_sar' && aoiCoordinates ? aoiCoordinates : undefined,
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

    mutation.mutate(requestBody)
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

  const getStatusMessage = () => {
    if (!orderId) return 'Error: No order ID provided.'
    if (isLoading) return 'Loading...'
    if (error) return 'Error loading items.'
    if (!item) return 'No order item found.'
    if (orderStatus === 'success') return 'Order placed successfully!'
    if (orderStatus === 'error') return 'Error placing order.'
    return null
  }

  const statusMessage = getStatusMessage()

  if (statusMessage) {
    return <Flex className={styles.status}>{statusMessage}</Flex>
  }

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
            {item?.collection}: {item?.id}
          </Text>
        </Flex>
        <Flex direction="row" gap="6" className={styles.bodyContainer}>
          {item && <ItemInfo item={item} isOptical={isOpticalData} />}
          <OrderSelections
            provider={getProviderType()}
            onSelectionChange={handleSelectionsChange}
          />
        </Flex>
        <TermsAndConditionsContainer provider={getProviderType()} />
        <Flex className={styles.buttonsContainer} direction="row" gap="3">
          <Button className={styles.cancelButton}>Cancel</Button>
          <Button
            className={styles.purchaseButton}
            onClick={placeOrder}
            disabled={!orderSelections.productBundle || mutation.isPending}
          >
            {mutation.isPending ? 'Placing Order...' : 'Place Order'}
          </Button>
        </Flex>
      </Flex>
    </>
  )
}
