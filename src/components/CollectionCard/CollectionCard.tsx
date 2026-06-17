import React, { useState } from 'react'
import { Collection } from '@/types'
import { Flex, Text, Inset } from '@radix-ui/themes'
import { GlobeIcon, CheckCircledIcon } from '@radix-ui/react-icons'
import styles from './CollectionCard.module.scss'
import PoundSterlingSymbolIcon from '@/assets/icons/pound-sterling-symbol.svg?react'
import { CollectionDetailsCard } from '../CollectionDetailsCard/CollectionDetailsCard'
import DefaultThumbnail from '@/assets/icons/default-thumbnail-wide.jpg'
import { getFormattedDateRange } from '@/library/dateUtils'
import { isCollectionPurchasable } from '@/library/purchasabilityConfig'
import { collectionHasQAIndicators } from '@/library/collectionQuality'
import { getCollectionLocation, Location } from '@/constants/collectionCategorizations'

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
  const location = getCollectionLocation(collection.id)
  const isGlobal = location === Location.Global
  const isUK = location === Location.United_Kingdom
  const hasQA = collectionHasQAIndicators(collection)

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
            {isGlobal && (
              <div className={styles.badge}>
                <GlobeIcon width="12" height="12" />
              </div>
            )}
            {isUK && <div className={styles.ukBadge}>UK</div>}
            {hasQA && (
              <div className={styles.badge}>
                <CheckCircledIcon width="12" height="12" />
              </div>
            )}
            {isLicenseProprietary && (
              <div className={styles.poundSign}>
                <PoundSterlingSymbolIcon width="12" height="12" />
              </div>
            )}
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
