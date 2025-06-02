import React, { useContext, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchItemFromCollection } from '@/services/itemService'
import { Flex, Text, Link, Badge } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import { OrderSelections } from './OrderSelections'
import { TermsAndConditions } from './TermsAndConditions'
import { ItemInfo } from './ItemInfo'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { getCatalog } from '@/library/catalogUtils'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { purchaseProduct } from '@/services/purchaseProductService'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { OrderButtons } from './OrderButtons'
import { PartialSceneSelect } from './PartialSceneSelect'
import type { Feature, Polygon } from 'geojson'
import { fetchQuote } from '@/services/quoteService'
import { bboxToPolygon } from '@/library/geoUtils'
import { Collection } from '@/types'
import { ChangeWokspaceModal } from '@/components/ChangeWokspaceModal/ChangeWokspaceModal'

export const OrderDetailsPage: React.FC = () => {
  const { state } = useLocation()
  const { item: navigatedItem } = state
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { currentWorkspace, token } = useContext(AuthenticationContext)
  const storedSelectedCollection = useSelector(dataFinderStore, (state) => state.context.collection)
  const selectedCollection = useMemo(() => {
    return (navigatedItem.collectionRef ?? storedSelectedCollection) as Collection
  }, [navigatedItem.collectionRef, storedSelectedCollection])
  const isOpticalData = !selectedCollection?.stac_extensions?.[0]?.includes('/sar/')
  const catalog = selectedCollection ? getCatalog(selectedCollection) : undefined

  const [isChangeWokspaceModalOpen, setIsChangeWokspaceModalOpen] = useState(false)
  const [orderSelections, setOrderSelections] = useState<Record<string, string>>({})
  const [orderStatus, setOrderStatus] = useState<'pending' | 'success' | 'error' | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isFullScene, setIsFullScene] = useState(false)

  const providerType = useMemo((): 'airbus_optical' | 'airbus_sar' | 'planet' => {
    if (catalog?.includes('planet')) return 'planet'
    if (catalog?.includes('airbus')) return isOpticalData ? 'airbus_optical' : 'airbus_sar'
    // fallback if unknown
    return 'airbus_optical'
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

  const isPlaceOrderDisabled = useMemo(() => {
    const baseInvalid = !orderSelections.productBundle || mutation.isPending || !termsAccepted

    const isAirbusSarMissingSelections =
      providerType === 'airbus_sar' &&
      (!orderSelections.orbit || !orderSelections.resolutionVariant || !orderSelections.projection)

    return Boolean(baseInvalid) || Boolean(isAirbusSarMissingSelections)
  }, [orderSelections, mutation.isPending, termsAccepted, providerType])

  function placeOrder() {
    if (!item) return
    const aoiCoordinates = aoiData?.geometry?.coordinates

    const requestBody = {
      workspace: currentWorkspace,
      token,
      item,
      provider: providerType,
      productBundle: orderSelections.productBundle,
      coordinates: providerType !== 'airbus_sar' && aoiCoordinates ? aoiCoordinates : undefined,
      licence: orderSelections.licence,
      radarOptions:
        providerType === 'airbus_sar'
          ? {
              orbit: orderSelections.orbit,
              resolutionVariant: orderSelections.resolutionVariant,
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
      fetchItemFromCollection({
        catalogUrl: catalog,
        collectionId: selectedCollection?.id,
        itemId: orderId,
      }),
    refetchOnWindowFocus: false,
    enabled: !!orderId,
  })

  const coordinates = useMemo((): number[][][] | undefined => {
    if (providerType === 'airbus_sar') return undefined

    if (aoiData?.geometry?.type === 'Polygon') {
      return aoiData.geometry.coordinates
    }

    if (item?.bbox) {
      const polygon = bboxToPolygon(item.bbox)
      return polygon.type === 'Polygon' ? polygon.coordinates : undefined
    }

    return undefined
  }, [providerType, aoiData, item])

  const {
    data: quote,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useQuery({
    queryKey: ['Quote', catalog, selectedCollection?.id, orderId, orderSelections.licence, aoiData],
    queryFn: () =>
      fetchQuote({
        workspace: currentWorkspace,
        token,
        item: item,
        coordinates: coordinates,
        licence: orderSelections.licence,
      }),
    enabled: !!item && (providerType === 'planet' || !!orderSelections.licence),

    refetchOnWindowFocus: false,
  })

  const getStatusMessage = () => {
    if (!orderId) return 'Error: No order ID provided.'
    if (isLoading) return 'Loading...'
    if (error) return 'Error loading items.'
    if (!item) return 'No order item found.'
    if (orderStatus === 'success')
      return 'Order Confirmed: Data will be available in the My Data section as soon as it is ready. '
    if (orderStatus === 'error') return 'Error placing order.'
    return null
  }

  const statusMessage = getStatusMessage()

  if (statusMessage) {
    return <Flex className={styles.status}>{statusMessage}</Flex>
  }

  const formatCurrency = (value: number, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(value)
    } catch (error) {
      return `${currency} ${value.toFixed(2)}`
    }
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
              providerType={providerType}
            />
          )}
          <Flex direction="column" gap="2">
            <Badge className={styles.tag}>{providerType}</Badge>
            <Text size="5" weight="bold">
              {item?.collection}: {item?.id}
            </Text>
            {/* <Text>Workspace: {currentWorkspace}</Text> */}
            <Flex gap="4">
              <Text size="3" weight="medium">
                Workspace: {currentWorkspace}
              </Text>
              <Link
                href="#"
                underline="always"
                weight="medium"
                onClick={(e) => {
                  e.preventDefault()
                  setIsChangeWokspaceModalOpen(true)
                }}
              >
                Change Workspace
              </Link>
            </Flex>

            {hasInitialAoi && providerType !== 'airbus_sar' ? (
              <PartialSceneSelect
                checked={isFullScene}
                onChange={(checked) => setIsFullScene(checked)}
              />
            ) : null}

            <OrderSelections provider={providerType} onSelectionChange={handleSelectionsChange} />

            <Text size="4" weight="bold" className={styles.cost}>
              {providerType !== 'planet' && !orderSelections.licence
                ? 'Select a licence type to get a quote.'
                : isQuoteLoading
                  ? 'Fetching cost...'
                  : quoteError
                    ? quoteError instanceof Error
                      ? quoteError.message
                      : 'Error fetching cost.'
                    : quote?.data
                      ? providerType === 'planet'
                        ? `Total credits: ${quote.data.value} ${quote.data.units}`
                        : `Total cost: ${formatCurrency(quote.data.value, quote.data.units || 'USD')}`
                      : null}
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
      <ChangeWokspaceModal
        isOpen={isChangeWokspaceModalOpen}
        onClose={() => setIsChangeWokspaceModalOpen(false)}
      />
    </>
  )
}
