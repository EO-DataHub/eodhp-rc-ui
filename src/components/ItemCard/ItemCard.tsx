import React from 'react'
import { Item } from '@/types'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton } from '@radix-ui/themes'
import styles from './ItemCard.module.scss'
import ShoppingCartFilled from '../../../public/shopping-cart-filled.svg?react'

interface ItemCardProps {
  item: Item
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  return (
    <Card className={styles.card}>
      <Flex gap="2">
        <img
          src={item.assets?.thumbnail?.href || '../../../public/default-item-thumbnail.jpg'}
          className={styles.thumbnail}
        />
        <Flex direction="column">
          <Text weight="bold" size="2" className={styles.text}>
            {item.id}
          </Text>
          <Text size="1" className={styles.text}>
            {new Date(item.properties.datetime).toLocaleString()}
          </Text>
          <Text size="1" className={styles.text}>
            Min 31.75 Max 32.86
          </Text>
          <Text size="1" className={styles.text}>
            HH, VV
          </Text>
          <Flex justify="end" gap="2">
            <IconButton radius="full" variant="solid" className={styles.button}>
              <InfoCircledIcon />
            </IconButton>
            <IconButton radius="full" variant="solid" className={styles.purchaiceButton}>
              <ShoppingCartFilled />
            </IconButton>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}
