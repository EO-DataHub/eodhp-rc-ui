import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Collection } from '@/types'
import { Flex, Text, Inset } from '@radix-ui/themes'
import styles from './UserCollectionCard.module.scss'
import DefaultThumbnail from '@/assets/icons/default-thumbnail-wide.jpg'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { getFormattedDateRange } from '@/library/dateUtils'

interface UserCollectionCardProps {
  collection: Collection
}

export const UserCollectionCard: React.FC<UserCollectionCardProps> = ({ collection }) => {
  const dateInterval = collection?.extent?.temporal?.interval[0] ?? []
  const thumbnailUrl = collection.assets?.thumbnail?.href
    ? collection.assets.thumbnail.href
    : DefaultThumbnail

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = DefaultThumbnail
  }

  const navigate = useNavigate()

  const handleOpenCollection = () => {
    // See: ItemPanel.tsx ~ln 50
    dataFinderStore.send({ type: 'queryFilterChange', queryFilter: undefined })
    void navigate(`/finder/my-${collection.id}`)
  }

  return (
    <Flex className={styles.card} direction="column" onClick={handleOpenCollection}>
      <Inset clip="padding-box" side="top" pb="current">
        <img src={thumbnailUrl} className={styles.thumbnail} onError={handleImageError} />
      </Inset>
      <Flex direction="column" p="4" justify="center" flexGrow="1" position="relative">
        <Text as="p" size="3" weight="medium" className={styles.text}>
          My {collection.title}
        </Text>
        <Text as="p" size="2" mt="2" className={styles.text}>
          {getFormattedDateRange(dateInterval)}
        </Text>
      </Flex>
    </Flex>
  )
}
