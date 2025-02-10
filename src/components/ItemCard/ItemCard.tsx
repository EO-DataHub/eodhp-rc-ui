import React from 'react'
import { Item } from '@/types'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Checkbox, Button } from '@radix-ui/themes'
import styles from './ItemCard.module.scss'
import MapsIcon from '../../../public/maps-icon.svg?react'
import CancelIcon from '../../../public/cancel-filled-icon.svg?react'
import DefaultItemThumbnail from '../../../public/default-item-thumbnail.jpg'
import { useNavigate } from 'react-router-dom'

interface ItemCardProps {
  item: Item
  isSelected: boolean
  isThumbnailSelected: boolean
  isChecked: boolean
  onSelect: (item: Item) => void
  onThumbnailSelect: (item: Item) => void
  onCheckboxChange: (item: Item, isChecked: boolean) => void
  isLicenseProprietary: boolean
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  isSelected,
  isThumbnailSelected,
  isChecked,
  onSelect,
  onCheckboxChange,
  onThumbnailSelect,
  isLicenseProprietary,
}) => {
  const navigate = useNavigate()

  const handlePurchase = () => {
    // Future function: check if user has purchase credits.
    // If the check passes, navigate to the order details page.
    navigate(`/order-details/${item.id}`)
  }
  return (
    <Card
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={() => onSelect(item)}
    >
      <Flex gap="1">
        <Flex
          align="center"
          justify="center"
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
          />
          <div className={`${styles.overlay} ${isThumbnailSelected ? styles.overlayActive : ''}`}>
            {isThumbnailSelected ? <CancelIcon /> : <MapsIcon />}
          </div>
        </Flex>
        <Flex direction="column" p="2">
          <Flex gap="2">
            <Text weight="bold" size="2" className={styles.text}>
              {item.id}
            </Text>
            <Checkbox
              mt="1"
              variant="surface"
              checked={isChecked}
              onCheckedChange={(checked) => onCheckboxChange(item, Boolean(checked))}
            />
          </Flex>
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
            {isLicenseProprietary ? (
              <Button
                variant="ghost"
                className={styles.button}
                onClick={() => {
                  handlePurchase()
                }}
              >
                Purchase
              </Button>
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}
