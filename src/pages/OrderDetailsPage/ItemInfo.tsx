import React from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Item } from '@/types'
import styles from './OrderDetailsPage.module.scss'
import DefaultItemThumbnail from '../../../public/default-item-thumbnail.jpg'

interface ItemInfoProps {
  item: Item
}

export const ItemInfo: React.FC<ItemInfoProps> = ({ item }) => {
  return (
    <Flex gap="2" className={styles.itemInfoContainer}>
      <Flex>
        <img
          src={item.assets?.thumbnail?.href || DefaultItemThumbnail}
          className={styles.thumbnail}
        />
      </Flex>
      <Flex direction="column" gap="0.5" className={styles.itemInfo}>
        <Text weight="bold" style={{ marginBottom: '0.5em' }}>
          Item Name
        </Text>
        <Text className={styles.itemText}>Area</Text>
        <Text className={styles.itemText}>
          {new Date(item.properties.datetime).toLocaleString()}
        </Text>
        <Text className={styles.itemText}>Data Source</Text>
        <Text className={styles.itemText}>Item Type</Text>
        <Text className={styles.itemText}>Cloud Cover</Text>
        <Text className={styles.itemText}>Look Angle</Text>
        <Text className={styles.itemText}>Heading</Text>
      </Flex>
    </Flex>
  )
}
