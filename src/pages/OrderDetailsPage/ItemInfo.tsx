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
      <Flex direction="column" gap="0.5">
        <Text>Item Name</Text>
        <Text>Area</Text>
        <Text>Date: {new Date(item.properties.datetime).toLocaleString()}</Text>
        <Text>Data Source</Text>
        <Text>Item Type</Text>
        <Text>Cloud Cover</Text>
        <Text>Look Angle</Text>
        <Text>Heading</Text>
      </Flex>
    </Flex>
  )
}
