import React, { useContext, useMemo, useState, useEffect } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { Item, ItemCardType } from '@/types'
import {
  BlendingModeIcon,
  Cross2Icon,
  DrawingPinIcon,
  EyeOpenIcon,
  InfoCircledIcon,
  ZoomInIcon,
} from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Button, Tooltip, Slider } from '@radix-ui/themes'
import styles from './ItemCard.module.scss'
import DefaultItemThumbnail from '@/assets/icons/default-thumbnail-square.jpg'
import { convertDateToUTCString } from '@/library/dateUtils'
import dataFinderStore, { getPinnedItemId } from '@/pages/DataFinderPage/useFinderStore'

import { useNavigate } from 'react-router-dom'
import {
  collectionCategorization,
  isValidCollectionId,
  itemCardFieldsToDisplay,
} from '@/constants/collectionCategorizations'
import { extractStacMetadata, getMetadataItemProperty } from '@/library/extractStacMetadata'
import { useSelector } from '@xstate/store/react'
import { useQuery } from '@tanstack/react-query'
import { fetchItem } from '@/services/ItemService'
import Legend from './Legend'

interface ItemCardProps {
  item: Item
  type: ItemCardType
}

const renderAdditionalFields = (item: Item, collectionId: string | null) => {
  if (!collectionId || !isValidCollectionId(collectionId)) {
    return null
  }

  const metadataItems = extractStacMetadata(item, [])

  const categorizationData = collectionCategorization[collectionId]
  const fields = [
    ...itemCardFieldsToDisplay[categorizationData.dataCategory[0]],
    ...categorizationData.additionalFieldsToDisplay,
  ]

  return fields.map((field) => {
    const fieldProperty = getMetadataItemProperty(field, metadataItems)

    if (!fieldProperty) {
      return null
    }

    return (
      <Text key={field} size="1" className={styles.text}>
        <Text weight="medium">{fieldProperty.label}</Text>:{' '}
        <Text dangerouslySetInnerHTML={{ __html: fieldProperty.formatted }}></Text>
      </Text>
    )
  })
}

const ActionButton = ({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}) => {
  return (
    <IconButton
      size="1"
      radius="full"
      variant="ghost"
      className={`${styles.iconButton} ${active ? styles.active : ''}`}
      onClick={onClick}
    >
      {children}
    </IconButton>
  )
}

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

  // temporarily fetching item details
  const { data } = useQuery({
    queryKey: ['Items', item?.collection, item?.id],
    queryFn: () => fetchItem({ collectionUrl: collectionUrl, itemId: item?.id }),
    refetchOnWindowFocus: false,
    enabled: !!item,
  })

  const navigate = useNavigate()
  const { isAuthenticated, login } = useContext(AuthenticationContext)

  const infoPanelItem = useSelector(dataFinderStore, (state) => state.context.infoPanelItem)

  const isSelected = infoPanelItem?.id === item.id

  const isLicenseProprietary = useSelector(
    dataFinderStore,
    (state) => state.context.collection?.license === 'proprietary',
  )
  const isUserCollection = useSelector(dataFinderStore, (state) => state.context.isUserCollection)
  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const collectionRender = useSelector(dataFinderStore, ({ context }) => context.collectionRender)
  const collectionRenderOptions = useSelector(
    dataFinderStore,
    ({ context }) => context.collectionRenderOptions,
  )
  const queryFilter = useSelector(dataFinderStore, (state) => state.context.queryFilter)
  const [itemRender, setItemRender] = useState(collectionRender)

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
        .map((key) => data.properties[key])
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

  const isAlreadyPinned = useSelector(dataFinderStore, (state) =>
    state.context.pinnedItems.some(
      (pinnedItem) =>
        collectionRender && pinnedItem.pinId === getPinnedItemId(item, collectionRender),
    ),
  )

  const [displayOpacitySelector, setOpacitySelectorVisible] = useState(false)

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = DefaultItemThumbnail
  }

  const handlePurchase = async () => {
    if (isAuthenticated) {
      navigate(`/order-details/${item.id}`)
    } else {
      await login()
    }
  }

  const cardTitle = useMemo(() => {
    if (!data?.properties?.title) {
      return item.id
    }

    return data.properties.title
  }, [data?.properties?.title, item.id])

  return (
    <Card
      key={item.id}
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onMouseEnter={() => dataFinderStore.send({ type: 'hoveredItemChange', item })}
      onMouseLeave={() => dataFinderStore.send({ type: 'hoveredItemChange', item: undefined })}
    >
      {isQueryCard && (
        <Flex
          align="center"
          justify="center"
          flexShrink="0"
          p="4"
          className={`${styles.thumbnailContainer} ${!itemRender ? styles.thumbnailContainerDisabled : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (!itemRender) return
            dataFinderStore.send({ type: 'addPinnedItem', item, collectionRender: itemRender })
          }}
        >
          <img
            src={item.assets?.thumbnail?.href || DefaultItemThumbnail}
            className={styles.thumbnail}
            onError={handleImageError}
          />
          <div className={styles.overlay}>
            <Tooltip content={isAlreadyPinned ? 'Already Pinned' : 'Pin Item'}>
              <DrawingPinIcon color={isAlreadyPinned ? 'gray' : 'white'} width={20} height={20} />
            </Tooltip>
          </div>
        </Flex>
      )}
      <Flex direction="column" p="2" flexGrow={'1'}>
        <Flex>
          <Flex direction="column" flexGrow={'1'}>
            <Flex justify="between">
              <Text weight="bold" size="2" className={styles.text} style={{ maxWidth: 220 }}>
                {cardTitle}
              </Text>
            </Flex>
            <Text size="1" className={styles.text}>
              {convertDateToUTCString(new Date(item.properties.datetime))}
            </Text>
            {data && renderAdditionalFields(data, item.collection)}
          </Flex>
          {isPinnedCard && (
            <Flex align="end" direction="column">
              <IconButton
                size="1"
                variant="soft"
                radius="full"
                className={styles.unpinButton}
                onClick={() => dataFinderStore.send({ type: 'removePinnedItem', item })}
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
        <Flex justify={isPinnedCard ? 'between' : 'end'} gap="2" align="center">
          {isPinnedCard && item.render && (
            <Flex>
              <Text size="1" className={styles.text}>
                {item.render.title}
              </Text>
            </Flex>
          )}
          <Flex justify="end" gap="4" align="center">
            {isQueryCard && itemRender && !isAlreadyPinned && (
              <ActionButton
                onClick={() =>
                  dataFinderStore.send({
                    type: 'addPinnedItem',
                    item,
                    collectionRender: itemRender,
                  })
                }
              >
                <Tooltip content="Pin Item">
                  <DrawingPinIcon />
                </Tooltip>
              </ActionButton>
            )}
            {isPinnedCard && (
              <>
                <ActionButton onClick={() => dataFinderStore.send({ type: 'zoomToItem', item })}>
                  <Tooltip content="Zoom to item">
                    <ZoomInIcon />
                  </Tooltip>
                </ActionButton>
                <ActionButton
                  active={item.mapRender?.visible}
                  onClick={() => dataFinderStore.send({ type: 'toggleItemVisibility', item })}
                >
                  <Tooltip content="Toggle visibility">
                    <EyeOpenIcon />
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
              </>
            )}
            <ActionButton
              active={isSelected}
              onClick={() => dataFinderStore.send({ type: 'toggleItemInfoPanel', item })}
            >
              <Tooltip content="More Info">
                <InfoCircledIcon />
              </Tooltip>
            </ActionButton>
            {isLicenseProprietary && !isUserCollection && (
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
