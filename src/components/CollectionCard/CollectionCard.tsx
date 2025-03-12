import React, { useState } from 'react'
import { Collection } from '@/types'
import { Flex, Text, Inset, IconButton } from '@radix-ui/themes'
import styles from './CollectionCard.module.scss'
import PoundSterlingSymbolIcon from '@/assets/icons/pound-sterling-symbol.svg?react'
import { CollectionDetailsCard } from '../CollectionDetailsCard/CollectionDetailsCard'
import DefaultThumbnail from '@/assets/icons/default-thumbnail-wide.jpg'
import { getFormattedDateRange } from '@/library/dateUtils'

interface CollectionCardProps {
  collection: Collection
}

export const CollectionCard: React.FC<CollectionCardProps> = ({ collection }) => {
  const [isDetailsCardOpen, setIsDetailsCardOpen] = useState(false)

  const dateInterval = collection?.extent?.temporal?.interval[0] ?? []

  const thumbnailUrl = collection.assets?.thumbnail?.href
    ? collection.assets.thumbnail.href
    : DefaultThumbnail

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = DefaultThumbnail
  }

  const isLicenseProprietary = collection?.license === 'proprietary'

  const handleOpenDetailsCard = () => {
    setIsDetailsCardOpen(true)
  }

  const handlePurchase = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    // TODO
  }

  return (
    <>
      <Flex className={styles.card} direction="column" onClick={handleOpenDetailsCard}>
        <Inset clip="padding-box" side="top" pb="current">
          <img src={thumbnailUrl} className={styles.thumbnail} onError={handleImageError} />
        </Inset>
        <Flex direction="column" p="4" justify="center" flexGrow="1" position="relative">
          <Flex justify="end" gap="2" position="absolute" right="16px" top="-12px">
            {isLicenseProprietary ? (
              <IconButton
                radius="full"
                variant="solid"
                size="1"
                className={styles.button}
                onClick={handlePurchase}
              >
                <PoundSterlingSymbolIcon width="12" height="12" />
              </IconButton>
            ) : null}
          </Flex>
          <Text as="p" size="2" className={styles.text}>
            {collection.title}
          </Text>
          <Text as="p" size="2" mt="2" className={styles.text}>
            {getFormattedDateRange(dateInterval)}
          </Text>
        </Flex>
      </Flex>

      <CollectionDetailsCard
        collection={collection}
        isOpen={isDetailsCardOpen}
        onClose={() => setIsDetailsCardOpen(false)}
      />
    </>
  )
}
