import React, { useContext, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchItem } from '@/services/ItemService'
import { Flex, Text, Link, Badge } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import { OrderSelections } from './OrderSelections'
import { TermsAndConditions } from './TermsAndConditions'
import { ItemInfo } from './ItemInfo'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { getCatalog } from '@/library/catalogUtils'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { purchaseProduct } from '@/services/PurchaseProductService'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { OrderButtons } from './OrderButtons'
import { PartialSceneSelect } from './PartialSceneSelect'
import type { Feature, Polygon } from 'geojson'

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { workspaceUserName, token } = useContext(AuthenticationContext)
  const selectedCollection = useSelector(dataFinderStore, (state) => state.context.collection)
  const isOpticalData = !selectedCollection?.stac_extensions?.[0]?.includes('/sar/')
  const catalog = selectedCollection ? getCatalog(selectedCollection) : undefined

  const [orderSelections, setOrderSelections] = useState<Record<string, string>>({})
  const [orderStatus, setOrderStatus] = useState<'pending' | 'success' | 'error' | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isFullScene, setIsFullScene] = useState(false)

  const providerType = useMemo((): 'airbus_optical' | 'airbus_sar' | 'planet' => {
    if (catalog === 'planet') return 'planet'
    return isOpticalData ? 'airbus_optical' : 'airbus_sar'
  }, [catalog, isOpticalData])

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

  const rawAoi = useMemo(() => {
    const stored = localStorage.getItem('aoiData')
    if (!stored) return null

    try {
      return JSON.parse(stored) as Feature<Polygon>
    } catch (e) {
      return null
    }
  }, [])

  const aoiData = !isFullScene ? rawAoi : null
  const hasInitialAoi = !!rawAoi?.geometry?.coordinates?.length

  const isPlaceOrderDisabled =
    !orderSelections.productBundle || mutation.isPending || !termsAccepted

  const placeOrder = () => {
    if (!item) return
    const aoiCoordinates = aoiData?.geometry?.coordinates

    const requestBody = {
      workspace: workspaceUserName,
      token,
      datasetUrl: item.links[0].href,
      provider: providerType,
      productBundle: orderSelections.productBundle,
      coordinates: providerType !== 'airbus_sar' && aoiCoordinates ? aoiCoordinates : undefined,
      licence: orderSelections.licence,
      radarOptions:
        providerType === 'airbus_sar'
          ? {
              orbit: orderSelections.orbit,
              resolution_variant: orderSelections.resolutionVariant,
              projection: orderSelections.projection,
            }
          : undefined,
      endUserCountry: orderSelections.country,
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
        <Flex gap="6" className={styles.bodyContainer}>
          {item && (
            <ItemInfo
              item={item}
              isOptical={isOpticalData}
              aoiGeojson={aoiData ? { type: 'FeatureCollection', features: [aoiData] } : undefined}
            />
          )}
          <Flex direction="column" gap="2">
            <Badge className={styles.tag}>{catalog}</Badge>
            <Text size="4" weight="bold">
              {item?.collection}: {item?.id}
            </Text>
            <Text>Workspace: {workspaceUserName}</Text>

            {hasInitialAoi && providerType !== 'airbus_sar' ? (
              <PartialSceneSelect
                checked={isFullScene}
                onChange={(checked) => setIsFullScene(checked)}
              />
            ) : null}

            <OrderSelections provider={providerType} onSelectionChange={handleSelectionsChange} />
            {/* todo : placeholder for now, add cost route */}
            <Text size="3" weight="bold" className={styles.cost}>
              Total cost $1000
            </Text>

            <TermsAndConditions provider={providerType} onTermsChange={setTermsAccepted} />

            <OrderButtons
              onPlaceOrder={placeOrder}
              isPlacingOrder={mutation.isPending}
              isDisabled={isPlaceOrderDisabled}
            />
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}
