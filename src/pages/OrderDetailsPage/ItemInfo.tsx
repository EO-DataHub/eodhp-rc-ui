import React, { useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Item } from '@/types'
import styles from './OrderDetailsPage.module.scss'
import DefaultItemThumbnail from '../../../public/default-item-thumbnail.jpg'
import { MetadataItem } from '@/types'
import { getStacMetadata } from '@/library/getStacMetadata'
import {
  extractOpticalOrderItemDetails,
  extractSAROrderItemDetails,
} from '@/pages/OrderDetailsPage/parseOrderItemDetails'
import parse from 'html-react-parser'

interface ItemInfoProps {
  item: Item
  isOptical: boolean
}

export const ItemInfo: React.FC<ItemInfoProps> = ({ item, isOptical }) => {
  const thumbnailUrl = item.assets?.thumbnail?.href
    ? item.assets?.thumbnail?.href
    : DefaultItemThumbnail

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = DefaultItemThumbnail
  }

  const metadata: MetadataItem[] = useMemo(() => {
    const ignoredFields = ['assets', 'providers', 'links']
    return item ? getStacMetadata(item, ignoredFields) : []
  }, [item])

  const orderItemDetails = useMemo(() => {
    if (!metadata.length) return {}

    return isOptical
      ? extractOpticalOrderItemDetails(metadata)
      : extractSAROrderItemDetails(metadata)
  }, [metadata, isOptical])

  if (!orderItemDetails) {
    return (
      <Flex gap="3" align="center">
        <Text>No metadata available.</Text>
      </Flex>
    )
  }

  return (
    <Flex gap="2" className={styles.itemInfoContainer}>
      <Flex>
        <img
          src={thumbnailUrl}
          alt="Item thumbnail"
          className={styles.thumbnail}
          onError={handleImageError}
        />
      </Flex>

      <Flex direction="column" gap="0.5" className={styles.itemInfo}>
        <Text weight="bold" style={{ marginBottom: '0.5em' }}>
          {item.id}
        </Text>

        {Object.entries(orderItemDetails).map(([parentKey, parentValue]) => (
          <Flex key={parentKey} direction="row" justify="between">
            <Text className={styles.itemText} weight="bold">
              {parentKey}:
            </Text>
            {typeof parentValue === 'object' && parentValue !== null ? (
              <Flex direction="column">
                {Object.entries(parentValue).map(([childKey, childValue]) => (
                  <Text key={`${parentKey}-${childKey}`} className={styles.itemText}>
                    {childKey}: {parse(String(childValue))}
                  </Text>
                ))}
              </Flex>
            ) : (
              <Text className={styles.itemText}>{parse(String(parentValue))}</Text>
            )}
          </Flex>
        ))}
      </Flex>
    </Flex>
  )
}
