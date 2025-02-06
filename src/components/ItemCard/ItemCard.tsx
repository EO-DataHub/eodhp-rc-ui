import React from 'react'
import { Item } from '@/types'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Button } from '@radix-ui/themes'
import styles from './ItemCard.module.scss'
import DefaultItemThumbnail from '../../../public/default-item-thumbnail.jpg'
import { Link } from 'react-router-dom'

interface ItemCardProps {
  item: Item
  isLicenseProprietary?: boolean
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, isLicenseProprietary }) => {
  // we will be adding an additional check in the future to determine if the user has purchase credits available
  // if so, the user will be able to click the purchase button
  // otherwise an error message will be displayed
  // this is pending on api updates

  return (
    <Card className={styles.card}>
      <Flex gap="2">
        <img
          src={item.assets?.thumbnail?.href || DefaultItemThumbnail}
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
          <Flex gap="3" className={styles.buttonGroup}>
            <IconButton radius="full" variant="solid" className={styles.iconButton}>
              <InfoCircledIcon />
            </IconButton>
            {/* {isLicenseProprietary ? ( */}
            {true ? (
              <Link to={`/order-details/${item.id}`}>
                <Button
                  variant="ghost"
                  className={styles.button}
                  onClick={() => {
                    /* future function that will check if user has purchase credits */
                  }}
                >
                  Purchase
                </Button>
              </Link>
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}
