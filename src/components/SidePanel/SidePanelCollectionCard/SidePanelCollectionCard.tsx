import React from 'react'
import { Collection } from '@/types'
import { Flex, Text, IconButton, Link, Tooltip } from '@radix-ui/themes'
import PoundSterlingSymbolIcon from '@/assets/icons/pound-sterling-symbol.svg?react'
import DefaultThumbnail from '@/assets/icons/default-thumbnail-wide.jpg'
import { getFormattedDateRange } from '@/library/dateUtils'
import styles from './SidePanelCollectionCard.module.scss'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { isCollectionPurchasable } from '@/library/purchasabilityConfig'

interface CollectionCardProps {
  collection: Collection
  onSelectCollectionInfo: () => void
  onChangeCollection: () => void
}

export const SidePanelCollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onSelectCollectionInfo,
  onChangeCollection,
}) => {
  const selectedCollection = useSelector(dataFinderStore, (state) => state.context.collection)
  const dateInterval = collection?.extent?.temporal?.interval[0] ?? []

  const thumbnailUrl = collection.assets?.thumbnail?.href
    ? collection.assets.thumbnail.href
    : DefaultThumbnail

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = DefaultThumbnail
  }

  const isLicenseProprietary = isCollectionPurchasable(collection)

  return (
    <Flex
      className={`${styles.card} ${selectedCollection?.id === collection.id ? styles.selected : ''}`}
    >
      <img src={thumbnailUrl} onError={handleImageError} className={styles.thumbnail} />
      <Flex direction="column" p="2" justify="between" flexGrow="1" gap="5">
        <Flex direction="column">
          <Text as="p" size="3" weight="medium" className={styles.text}>
            {collection.displayedTitle}
          </Text>
          <Text as="p" size="1" className={styles.text}>
            {getFormattedDateRange(dateInterval)}
          </Text>
        </Flex>
        <Flex justify="end" gap="2" align="center">
          {isLicenseProprietary && (
            <IconButton radius="full" variant="solid" className={styles.costButton}>
              <PoundSterlingSymbolIcon width="6" height="9" />
            </IconButton>
          )}

          <Tooltip content="View Metadata">
            <IconButton
              radius="full"
              variant="solid"
              className={styles.infoButton}
              onClick={onSelectCollectionInfo}
            >
              <InfoCircledIcon width="20" height="20" />
            </IconButton>
          </Tooltip>

          <Link size="2" className={styles.link} onClick={onChangeCollection}>
            Open Collection
          </Link>
        </Flex>
      </Flex>
    </Flex>
  )
}
