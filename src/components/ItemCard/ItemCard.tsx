import React, { useContext, useMemo } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { Item } from '@/types'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Checkbox, Button, Tooltip } from '@radix-ui/themes'
import styles from './ItemCard.module.scss'
import MapsIcon from '@/assets/icons/maps-icon.svg?react'
import CancelIcon from '@/assets/icons/cancel-filled-icon.svg?react'
import DefaultItemThumbnail from '@/assets/icons/default-thumbnail-square.jpg'
import { convertDateToUTCString } from '@/library/dateUtils'

import { useNavigate } from 'react-router-dom'
import {
  collectionCategorization,
  isValidCollectionId,
  itemCardFieldsToDisplay,
} from '@/constants/collectionCategorizations'
import { extractStacMetadata, getMetadataItemProperty } from '@/library/extractStacMetadata'
import { useQuery } from '@tanstack/react-query'
import { fetchItem } from '@/services/ItemService'
import { getCatalogByURL } from '@/library/catalogUtils'

interface ItemCardProps {
  item: Item
  collectionId: string | null
  isSelected: boolean
  isThumbnailSelected: boolean
  isChecked: boolean
  onSelect: (item: Item) => void
  onSelectItemInfo: (item: Item) => void
  onThumbnailSelect: (item: Item) => void
  onCheckboxChange: (item: Item, isChecked: boolean) => void
  onMouseEnter?: (item: Item) => void
  onMouseLeave?: (item: Item) => void
  isLicenseProprietary: boolean
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

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  collectionId,
  isSelected,
  isThumbnailSelected,
  isChecked,
  onSelect,
  onSelectItemInfo,
  onCheckboxChange,
  onMouseEnter,
  onMouseLeave,
  onThumbnailSelect,
  isLicenseProprietary,
}) => {
  const rootCatalog = useMemo(() => {
    const url = item?.links.find((link) => link.rel === 'parent')?.href
    return url ? getCatalogByURL(url) : undefined
  }, [item?.links])

  // temporarily fetching item details
  const { data } = useQuery({
    queryKey: ['Items', item?.collection, item?.id],
    queryFn: () =>
      fetchItem({ catalog: rootCatalog, collection: item?.collection, item: item?.id }),
    refetchOnWindowFocus: false,
    enabled: !!item,
  })

  const navigate = useNavigate()
  const { isAuthenticated, login } = useContext(AuthenticationContext)

  const handlePurchase = async () => {
    // in the future we will also check if the user has purchase credits available
    if (isAuthenticated) {
      navigate(`/order-details/${item.id}`)
    } else {
      await login()
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = DefaultItemThumbnail
  }

  return (
    <Card
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={() => onSelect(item)}
      onMouseEnter={() => onMouseEnter?.(item)}
      onMouseLeave={() => onMouseLeave?.(item)}
    >
      <Flex
        align="center"
        justify="center"
        flexShrink="0"
        p="4"
        className={`${styles.thumbnailContainer} ${
          isThumbnailSelected ? styles.thumbnailSelected : ''
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onThumbnailSelect(item)
        }}
      >
        <img
          src={item.assets?.thumbnail?.href || DefaultItemThumbnail}
          className={styles.thumbnail}
          onError={handleImageError}
        />
        <div className={`${styles.overlay} ${isThumbnailSelected ? styles.overlayActive : ''}`}>
          {isThumbnailSelected ? <CancelIcon /> : <MapsIcon />}
        </div>
      </Flex>
      <Flex direction="column" p="2" justify="between" flexGrow="1">
        <Flex direction="column">
          <Flex justify="between">
            <Text weight="bold" size="2" className={styles.text} style={{ maxWidth: 220 }}>
              {data?.properties?.title ?? item.id}
            </Text>
            <Checkbox
              mt="1"
              variant="surface"
              checked={isChecked}
              onCheckedChange={(checked) => onCheckboxChange(item, Boolean(checked))}
              style={{ flexShrink: 0, flexGrow: 0 }}
            />
          </Flex>
          <Text size="1" className={styles.text}>
            {convertDateToUTCString(new Date(item.properties.datetime))}
          </Text>
          {data && renderAdditionalFields(data, collectionId)}
        </Flex>
        <Flex justify="end" gap="2" align="center">
          <Tooltip content="More Info">
            <IconButton
              radius="full"
              variant="ghost"
              className={styles.button}
              onClick={() => onSelectItemInfo(item)}
            >
              <InfoCircledIcon />
            </IconButton>
          </Tooltip>
          {isLicenseProprietary && (
            <Button
              variant="ghost"
              className={styles.button}
              onClick={async () => {
                await handlePurchase()
              }}
            >
              Purchase
            </Button>
          )}
        </Flex>
      </Flex>
    </Card>
  )
}
