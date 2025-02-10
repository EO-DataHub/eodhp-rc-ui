import React, { useState } from 'react'
import { Collection } from '@/types'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, Inset, IconButton } from '@radix-ui/themes'
import styles from './CollectionCard.module.scss'
import PoundSterlingSymbolIcon from '../../../public/pound-sterling-symbol.svg?react'
import { CollectionDetailsCard } from '../CollectionDetailsCard/CollectionDetailsCard'
import PlaceholderImage from '../../../public/placeholder-img.png'
import { getFormattedDateRange } from '@/library/getFormattedDateRange'

interface CollectionCardProps {
  collection: Collection
}

export const CollectionCard: React.FC<CollectionCardProps> = ({ collection }) => {
  const [isDetailsCardOpen, setIsDetailsCardOpen] = useState(false)

  const dateInterval = collection?.extent?.temporal?.interval[0] ?? []

  const thumbnailUrl = collection.assets?.thumbnail?.href
    ? collection.assets.thumbnail.href
    : PlaceholderImage

  return (
    <>
      <Card size="2" className={styles.card}>
        <Inset clip="padding-box" side="top" pb="current">
          <img src={thumbnailUrl} className={styles.thumbnail} />
        </Inset>
        <Flex justify="end" mt="-6" gap="2">
          <IconButton radius="full" variant="solid" className={styles.button}>
            <PoundSterlingSymbolIcon width="16" height="16" />
          </IconButton>
          <IconButton
            radius="full"
            variant="solid"
            className={styles.button}
            onClick={() => setIsDetailsCardOpen(true)}
          >
            <InfoCircledIcon width="25" height="25" />
          </IconButton>
        </Flex>
        <Text as="p" size="3" className={styles.text}>
          {collection.title}
        </Text>
        <Text as="p" size="3" className={styles.text}>
          {getFormattedDateRange(dateInterval)}
        </Text>
      </Card>

      <CollectionDetailsCard
        collection={collection}
        isOpen={isDetailsCardOpen}
        onClose={() => setIsDetailsCardOpen(false)}
      />
    </>
  )
}
