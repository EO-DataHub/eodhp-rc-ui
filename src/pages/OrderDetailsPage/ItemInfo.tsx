import React, { useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Item } from '@/types'
import styles from './OrderDetailsPage.module.scss'
import { MetadataItem } from '@/types'
import { extractStacMetadata } from '@/library/extractStacMetadata'
import {
  extractOpticalOrderItemDetails,
  extractSAROrderItemDetails,
  extractPlanetOrderItemDetails,
} from '@/pages/OrderDetailsPage/extractOrderItemDetails'
import parse from 'html-react-parser'
import { ItemMap } from './ItemMap/ItemMap'

interface ItemInfoProps {
  item: Item
  isOptical: boolean
  aoiGeojson?: GeoJSON.FeatureCollection
  providerType: 'airbus_optical' | 'airbus_sar' | 'planet'
}

export const ItemInfo: React.FC<ItemInfoProps> = ({
  item,
  isOptical,
  aoiGeojson,
  providerType,
}) => {
  const metadata: MetadataItem[] = useMemo(() => {
    const ignoredFields = ['assets', 'providers', 'links']
    return item ? extractStacMetadata(item, ignoredFields) : []
  }, [item])

  const orderItemDetails = useMemo(() => {
    if (!metadata.length) return {}

    // planet's structure is already flat so we don't need to pass in metadata
    if (providerType === 'planet') {
      return extractPlanetOrderItemDetails(
        item?.properties as Record<string, string | number | boolean | null>,
      )
    }

    return isOptical
      ? extractOpticalOrderItemDetails(metadata)
      : extractSAROrderItemDetails(metadata)
  }, [metadata, isOptical, providerType, item])

  if (Object.keys(orderItemDetails).length === 0) {
    return (
      <Flex gap="3" align="center">
        <Text>No metadata available.</Text>
      </Flex>
    )
  }

  return (
    <Flex gap="2" className={styles.itemInfoContainer}>
      <Flex>
        <ItemMap item={item} aoiGeojson={aoiGeojson} providerType={providerType} />
      </Flex>

      <Flex direction="column" gap="0.5" className={styles.itemInfo}>
        <Text weight="bold" style={{ marginBottom: '0.5em' }}>
          {item.id}
        </Text>

        {Object.entries(orderItemDetails).map(([parentKey, parentValue]) => (
          <Flex key={parentKey} direction="row" gap="1">
            <Text className={styles.itemText}>{parentKey}:</Text>
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
