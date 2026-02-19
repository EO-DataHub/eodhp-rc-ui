import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { CubeData, Item, ItemCardType } from '@/types'
import {
  BlendingModeIcon,
  Cross2Icon,
  DrawingPinIcon,
  EyeOpenIcon,
  EyeClosedIcon,
  InfoCircledIcon,
  ZoomInIcon,
  HamburgerMenuIcon,
} from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Button, Tooltip, Slider } from '@radix-ui/themes'
import { TiffViewer } from '@/components/TiffViewer/TiffViewer'
import AuthenticatedThumbnail from './AuthenticatedThumbnail'
import styles from './ItemCard.module.scss'
import { convertDateToUTCString } from '@/library/dateUtils'
import dataFinderStore, { getPinnedItemId } from '@/pages/DataFinderPage/useFinderStore'

import { useNavigate } from 'react-router-dom'
import {
  collectionCategorization,
  isValidCollectionId,
  itemCardFieldsToDisplay,
} from '@/constants/collectionCategorizations'
import { extractStacMetadata, getMetadataItemProperty } from '@/library/extractStacMetadata'
import {
  collectionRenderingConfig,
  getCollectionConfigKey,
  getThumbnailAssetUrl,
  requiresThumbnailAuthentication,
  getAssetsByType,
} from '@/library/collectionRenderingConfig'
import { useSelector } from '@xstate/store/react'
import { useQuery } from '@tanstack/react-query'
import { fetchItem } from '@/services/itemService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { extractWorkspaceFromCollection } from '@/library/catalogUtils'
import Legend from './Legend'
import { supportsIntegrationTools } from '@/library/integrationTools'
import { AssetSelector } from './AssetSelector'

interface ItemCardProps {
  item: Item
  type: ItemCardType
}

const renderAdditionalFields = (item: Item, collectionId: string | null) => {
  if (!collectionId || !isValidCollectionId(collectionId)) {
    return null
  }

  const metadataItems = extractStacMetadata(item, ['providers'])

  const categorizationData = collectionCategorization[collectionId]
  const fields = [
    ...itemCardFieldsToDisplay[categorizationData.dataCategory[0]],
    ...categorizationData.additionalFieldsToDisplay,
    ['order:options', 'order.options', 'order_options'],
    ['order:date', 'order.date', 'order_date'],
    ['order:status', 'order.status', 'order_status'],
    ['order:id', 'order.id', 'order_id'],
  ]

  return fields.map((field) => {
    const fieldObject = getMetadataItemProperty(field, metadataItems)

    if (!fieldObject) {
      return null
    }

    const { rawFieldName, fieldProperty } = fieldObject

    let formattedText: string | TrustedHTML = fieldProperty.formatted

    if (['order.options', 'order:options', 'order_options'].includes(rawFieldName)) {
      formattedText = (fieldProperty.value as CubeData).productBundle
    }

    return (
      <Text key={rawFieldName} size="1" className={styles.text}>
        <Text weight="medium">{fieldProperty.label}</Text>:{' '}
        <Text dangerouslySetInnerHTML={{ __html: formattedText }}></Text>
      </Text>
    )
  })
}

const ActionButton = React.forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode
    onClick: () => void
    active?: boolean
    disabled?: boolean
  }
>(({ children, onClick, active, disabled }, ref) => {
  return (
    <IconButton
      ref={ref}
      size="1"
      radius="full"
      variant="ghost"
      className={`${styles.iconButton} ${active ? styles.active : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </IconButton>
  )
})

ActionButton.displayName = 'ActionButton'

const OpacitySelector = ({ item }: { item: Item }) => {
  return (
    <Flex width="100%" gap="1" align="start" direction="column">
      <Text size="1" className={styles.text}>
        Opacity
      </Text>
      <Slider
        min={0}
        max={1}
        step={0.1}
        defaultValue={[item.mapRender?.opacity ?? 1]}
        onValueChange={(value) =>
          dataFinderStore.send({
            type: 'changeItemOpacity',
            item,
            opacity: value[0],
          })
        }
      />
    </Flex>
  )
}

const ItemCard = ({ item, type }: ItemCardProps) => {
  const collectionUrl = useMemo(() => {
    const url = item?.links.find((link) => link.rel === 'parent')?.href
    return url
  }, [item?.links])

  const navigate = useNavigate()
  const { isAuthenticated, login, token } = useContext(AuthenticationContext)

  const infoPanelItem = useSelector(dataFinderStore, (state) => state.context.infoPanelItem)
  const secondaryPanel = useSelector(dataFinderStore, (state) => state.context.secondaryPanel)

  const isSelected = infoPanelItem?.id === item.id && secondaryPanel === 'item-info'
  const isIntegrationToolsSelected =
    infoPanelItem?.id === item.id && secondaryPanel === 'integration-tools'
  const isAnyPanelSelected = infoPanelItem?.id === item.id

  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const isUserCollection = useSelector(dataFinderStore, (state) => state.context.isUserCollection)
  const collectionRender = useSelector(dataFinderStore, ({ context }) => context.collectionRender)
  const collectionRenderOptions = useSelector(
    dataFinderStore,
    ({ context }) => context.collectionRenderOptions,
  )

  const isLicenseProprietary = useMemo(() => {
    if (item.isLicenseProprietary !== undefined) {
      return item.isLicenseProprietary
    }
    return collection?.license === 'proprietary'
  }, [collection?.license, item.isLicenseProprietary])

  const itemBelongsToUserCollection = useMemo(() => {
    if (item.isUserCollection !== undefined) {
      return item.isUserCollection
    }
    return isUserCollection
  }, [isUserCollection, item.isUserCollection])

  const queryFilter = useSelector(dataFinderStore, (state) => state.context.queryFilter)
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)

  const [itemRender, setItemRender] = useState(collectionRender)

  // Determine if collection is a job collection
  const isJobCollection = collection?.isJobCollection ?? false

  // Check if the collection requires authentication for thumbnails
  const requiresThumbnailAuth = useMemo(() => {
    // Job collections always require authentication
    if (isJobCollection) return true

    const configKey = getCollectionConfigKey(item.collection, itemBelongsToUserCollection)
    const collectionConfig = collectionRenderingConfig[configKey]
    return requiresThumbnailAuthentication(collectionConfig, itemBelongsToUserCollection)
  }, [item.collection, itemBelongsToUserCollection, isJobCollection])

  // Get thumbnail URL using configured asset with fallback
  const thumbnailUrl = useMemo(() => {
    const configKey = getCollectionConfigKey(item.collection, itemBelongsToUserCollection)
    const collectionConfig = collectionRenderingConfig[configKey]
    return getThumbnailAssetUrl(item, collectionConfig)
  }, [item, itemBelongsToUserCollection])

  // Check if pin button should be disabled
  const isPinButtonDisabled = useMemo(() => {
    return requiresThumbnailAuth && !isAuthenticated
  }, [requiresThumbnailAuth, isAuthenticated])

  // Extract workspace from collection for job collections
  const collectionWorkspace = isJobCollection ? extractWorkspaceFromCollection(collection!) : null

  // Get image/tiff assets for job collections
  const imageAssets = useMemo(() => getAssetsByType(item.assets, 'image/tiff'), [item.assets])
  const showAssetSelector = isJobCollection && imageAssets.length > 0

  // State for selected asset key (defaults to first image/tiff asset)
  const [selectedAssetKey, setSelectedAssetKey] = useState<string | undefined>(imageAssets[0]?.key)

  // Update selectedAssetKey when imageAssets change
  useEffect(() => {
    if (imageAssets.length > 0 && !selectedAssetKey) {
      setSelectedAssetKey(imageAssets[0]?.key)
    }
  }, [imageAssets, selectedAssetKey])

  // Fetch workspace tokens for job collections
  const { data: jobWorkspaceTokensData } = useQuery({
    queryKey: ['WorkspaceTokens', collectionWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(collectionWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: !!isJobCollection && !!collectionWorkspace && !!token && isAuthenticated,
  })

  // temporarily fetching item details
  const { data } = useQuery({
    queryKey: ['Items', item?.collection, item?.id, isJobCollection],
    queryFn: () =>
      fetchItem({
        collectionUrl: collectionUrl,
        itemId: item?.id,
        workspaceToken: isJobCollection ? jobWorkspaceTokensData?.access : undefined,
      }),
    refetchOnWindowFocus: false,
    enabled:
      !!item &&
      (!isUserCollection || isJobCollection) &&
      (!isJobCollection || !!jobWorkspaceTokensData),
  })

  // In order to determine if the item is already pinned, we need a unique ID
  // for the pin to query the existing pinned items. If the item already has a
  // pinId, we can use it. Otherwise, for query items, we need to generate a
  // new one based on the item ID and the collection/item render.
  const pinId =
    item.pinId ??
    (itemRender
      ? getPinnedItemId(item, itemRender)
      : collectionRender
        ? getPinnedItemId(item, collectionRender)
        : undefined)
  const isAlreadyPinned = pinnedItems.some((pinnedItem) => pinnedItem.pinId === pinId)

  // Determine tooltip text based on state
  const pinButtonTooltipText = useMemo(() => {
    if (requiresThumbnailAuth && !isAuthenticated) {
      return 'Log in to pin'
    }
    return isAlreadyPinned ? 'Unpin Item' : 'Pin Item'
  }, [requiresThumbnailAuth, isAuthenticated, isAlreadyPinned])

  const unpinItem = useCallback(
    () => dataFinderStore.send({ type: 'removePinnedItem', item: { ...item, pinId } }),
    [item, pinId],
  )

  const pinItem = useCallback(
    () =>
      dataFinderStore.send({
        type: 'addPinnedItem',
        item,
        selectedAssetKey,
        isLicenseProprietary: collection?.license === 'proprietary',
        isUserCollection: isUserCollection,
        collectionName: collection?.title ?? collection?.id ?? '',
        collection,
        collectionRender: (itemRender ?? collectionRender)!,
      }),
    [item, collection, isUserCollection, itemRender, collectionRender, selectedAssetKey],
  )

  useEffect(() => {
    // If not a time variable item, use collectionRender
    if (
      !collection?.['eodhrc:time-variable-items'] ||
      !collection['eodhrc:render-key-properties']
    ) {
      setItemRender(collectionRender)
      return
    }

    // by default, set the item render for time variable items to undefined
    setItemRender(undefined)

    // For time variable items, check if we have the required data
    if (!data?.properties) {
      return
    }

    // Check if all required properties exist
    const hasAllProperties = collection['eodhrc:render-key-properties'].every(
      (key) => data.properties[key] !== undefined,
    )

    if (hasAllProperties) {
      // For time variable items, construct the render key from the specified properties
      const renderKey = collection['eodhrc:render-key-properties']
        .map((key) => data.properties[key] as string)
        .join('--')

      const render = collectionRenderOptions.find((render) => render.id === renderKey)
      if (render) {
        setItemRender({
          ...render,
          id: renderKey,
          title: render.title ?? '',
          assets: render.assets ?? [],
        })
      }
    }
  }, [collection, data?.properties, collectionRender, collectionRenderOptions, queryFilter])

  const isPinnedCard = type === 'pinned-item'
  const isQueryCard = type === 'query-item'

  const [displayOpacitySelector, setOpacitySelectorVisible] = useState(false)

  const handlePurchase = async () => {
    if (isAuthenticated) {
      void navigate(`/order-details/${item.id}`, { state: { item } })
    } else {
      await login()
    }
  }

  const cardTitle = useMemo(() => {
    if (!data?.properties?.title) {
      return item.id
    }

    return data.properties.title as string
  }, [data?.properties?.title, item.id])

  return (
    <Card
      key={item.id}
      className={`${styles.card} ${isAnyPanelSelected ? styles.selected : ''}`}
      onMouseEnter={() => dataFinderStore.send({ type: 'hoveredItemChange', item })}
      onMouseLeave={() => dataFinderStore.send({ type: 'hoveredItemChange', item: undefined })}
    >
      <Flex
        align="center"
        justify="center"
        flexShrink="0"
        p="4"
        className={`${styles.thumbnailContainer} ${!itemRender ? styles.thumbnailContainerDisabled : ''} ${isPinButtonDisabled ? styles.pinButtonDisabled : ''}`}
        onClick={() => {
          if (isPinButtonDisabled) {
            return // Button is disabled, no action
          }
          !isAlreadyPinned ? pinItem() : unpinItem()
        }}
      >
        {thumbnailUrl && (thumbnailUrl.endsWith('.tif') || thumbnailUrl.endsWith('.tiff')) ? (
          <TiffViewer url={thumbnailUrl} className={styles.thumbnail} />
        ) : (
          <AuthenticatedThumbnail
            thumbnailUrl={thumbnailUrl ?? ''}
            className={styles.thumbnail}
            requiresAuth={requiresThumbnailAuth}
            isUserCollection={itemBelongsToUserCollection}
            isJobCollection={isJobCollection}
            workspaceToken={isJobCollection ? jobWorkspaceTokensData?.access : undefined}
          />
        )}
        <div className={styles.overlay}>
          <Tooltip content={pinButtonTooltipText}>
            <DrawingPinIcon
              color={isPinButtonDisabled ? 'gray' : isAlreadyPinned ? 'gray' : 'white'}
              width={20}
              height={20}
            />
          </Tooltip>
        </div>
      </Flex>
      <Flex direction="column" p="2" flexGrow={'1'} justify="between" style={{ minWidth: 0 }}>
        <Flex style={{ minWidth: 0 }}>
          <Flex direction="column" flexGrow={'1'} style={{ minWidth: 0 }}>
            <Flex direction="column" justify="between" style={{ minWidth: 0 }}>
              <Text weight="bold" size="2" className={styles.text} style={{ maxWidth: '100%' }}>
                {item.collectionName}
              </Text>
              <Text weight="bold" size="2" className={styles.text} style={{ maxWidth: '100%' }}>
                {cardTitle}
              </Text>
            </Flex>
            <Text size="1" className={styles.text}>
              {item.properties.datetime
                ? convertDateToUTCString(new Date(item.properties.datetime))
                : 'N/A'}
            </Text>
            {data
              ? renderAdditionalFields(data, item.collection)
              : renderAdditionalFields(item, item.collection)}
          </Flex>
          {isPinnedCard && (
            <Flex align="end" direction="column">
              <IconButton
                size="1"
                variant="soft"
                radius="full"
                className={styles.unpinButton}
                onClick={unpinItem}
              >
                <Cross2Icon />
              </IconButton>
            </Flex>
          )}
        </Flex>
        {displayOpacitySelector && (
          <Flex align="center">
            <OpacitySelector item={item} />
          </Flex>
        )}
        <Legend item={item} />
        <Flex
          justify={isPinnedCard ? 'between' : 'end'}
          gap="2"
          align="center"
          style={{ minWidth: 0, flexShrink: 0 }}
        >
          {isPinnedCard && item.render && (
            <Flex>
              <Text size="1" className={styles.text}>
                {item.render.title}
              </Text>
            </Flex>
          )}
          <Flex justify="end" gap="3" align="center">
            {isQueryCard && itemRender && (
              <>
                {showAssetSelector && (
                  <AssetSelector
                    assets={item.assets}
                    selectedAssetKey={selectedAssetKey}
                    onSelect={setSelectedAssetKey}
                    disabled={isPinButtonDisabled}
                  />
                )}
                {!isAlreadyPinned ? (
                  <Tooltip content={pinButtonTooltipText}>
                    <ActionButton
                      onClick={() => {
                        if (isPinButtonDisabled) {
                          return
                        }
                        pinItem()
                      }}
                      disabled={isPinButtonDisabled}
                    >
                      <DrawingPinIcon />
                    </ActionButton>
                  </Tooltip>
                ) : (
                  <Tooltip content={pinButtonTooltipText}>
                    <ActionButton
                      onClick={() => {
                        if (isPinButtonDisabled) {
                          return
                        }
                        unpinItem()
                      }}
                      active={isAlreadyPinned}
                      disabled={isPinButtonDisabled}
                    >
                      <DrawingPinIcon />
                    </ActionButton>
                  </Tooltip>
                )}
                <ActionButton onClick={() => dataFinderStore.send({ type: 'zoomToItem', item })}>
                  <Tooltip content="Zoom to item">
                    <ZoomInIcon />
                  </Tooltip>
                </ActionButton>
              </>
            )}
            {isPinnedCard && (
              <>
                {showAssetSelector && (
                  <AssetSelector
                    assets={item.assets}
                    selectedAssetKey={item.selectedAssetKey}
                    onSelect={(key) => {
                      dataFinderStore.send({
                        type: 'updatePinnedItemAsset',
                        item: { ...item, selectedAssetKey: key },
                      })
                    }}
                  />
                )}
                <ActionButton
                  active={item.mapRender?.visible}
                  onClick={() => dataFinderStore.send({ type: 'toggleItemVisibility', item })}
                >
                  <Tooltip content="Toggle visibility">
                    {item.mapRender?.visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </Tooltip>
                </ActionButton>
                <ActionButton
                  active={displayOpacitySelector}
                  onClick={() => setOpacitySelectorVisible(!displayOpacitySelector)}
                >
                  <Tooltip content="Change item opacity">
                    <BlendingModeIcon />
                  </Tooltip>
                </ActionButton>
                <ActionButton onClick={() => dataFinderStore.send({ type: 'zoomToItem', item })}>
                  <Tooltip content="Zoom to item">
                    <ZoomInIcon />
                  </Tooltip>
                </ActionButton>
              </>
            )}
            {supportsIntegrationTools(item, itemRender) && (
              <ActionButton
                active={isIntegrationToolsSelected}
                onClick={() =>
                  dataFinderStore.send({
                    type: 'toggleIntegrationToolsPanel',
                    item: { ...item, render: itemRender },
                  })
                }
              >
                <Tooltip content="Integration Tools">
                  <HamburgerMenuIcon />
                </Tooltip>
              </ActionButton>
            )}
            <ActionButton
              active={isSelected}
              onClick={() => dataFinderStore.send({ type: 'toggleItemInfoPanel', item })}
            >
              <Tooltip content="View Metadata">
                <InfoCircledIcon />
              </Tooltip>
            </ActionButton>
            {isLicenseProprietary &&
              !itemBelongsToUserCollection &&
              !collection?.isJobCollection && (
                <Button variant="ghost" className={styles.button} onClick={() => handlePurchase()}>
                  Purchase
                </Button>
              )}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}

export default ItemCard
