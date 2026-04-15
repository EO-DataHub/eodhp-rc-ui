import React, { useState } from 'react'
import { Collection } from '@/types'
import { Flex, Text, Inset } from '@radix-ui/themes'
import styles from './CollectionCard.module.scss'
import PoundSterlingSymbolIcon from '@/assets/icons/pound-sterling-symbol.svg?react'
import { CollectionDetailsCard } from '../CollectionDetailsCard/CollectionDetailsCard'
import DefaultThumbnail from '@/assets/icons/default-thumbnail-wide.jpg'
import { getFormattedDateRange } from '@/library/dateUtils'
import { isCollectionPurchasable } from '@/library/purchasabilityConfig'

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

  const isLicenseProprietary = isCollectionPurchasable(collection)

  const handleOpenDetailsCard = () => {
    setIsDetailsCardOpen(true)
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
              <div className={styles.poundSign}>
                <PoundSterlingSymbolIcon width="12" height="12" />
              </div>
            ) : null}
          </Flex>
          <Text as="p" size="3" weight="medium" className={styles.text}>
            {collection.displayedTitle}
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
