import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Collection } from '@/types'
import { Dialog, Button, Flex, Text, Badge } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import styles from './CollectionDetailsCard.module.scss'
import { getFormattedDateRange } from '@/library/dateUtils'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import DefaultThumbnail from '@/assets/icons/default-thumbnail-square.jpg'

interface CollectionDetailsCardProps {
  collection: Collection
  isOpen: boolean
  onClose: () => void
}

export const CollectionDetailsCard: React.FC<CollectionDetailsCardProps> = ({
  collection,
  isOpen,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

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
    dataFinderStore.send({ type: 'setCollection', collection: collection })
    // See: ItemPanel.tsx ~ln 50
    dataFinderStore.send({ type: 'queryFilterChange', queryFilter: undefined })

    if (collection.isUserCollection) {
      navigate(`/finder/my-${collection.id}`)
    } else {
      navigate(`/finder/${collection.id}`)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content
        maxWidth="750px"
        className={styles.dialogContent}
        ref={containerRef}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          containerRef.current?.setAttribute('tabindex', '-1')
          containerRef.current?.focus()
        }}
      >
        <Dialog.Close>
          <Button variant="ghost" aria-label="Close" className={styles.closeButton} tabIndex={0}>
            <Cross1Icon />
          </Button>
        </Dialog.Close>
        <Flex direction="row" gap="7" className={styles.flexContainer}>
          <img
            src={thumbnailUrl}
            alt="Collection thumbnail"
            className={styles.thumbnail}
            onError={handleImageError}
          />
          <Flex direction="column" className={styles.details}>
            <Dialog.Title className={styles.dialogTitle}>{collection.displayedTitle}</Dialog.Title>
            <Text size="2" color="gray" mb="2">
              {getFormattedDateRange(dateInterval)}
            </Text>
            <Dialog.Description size="2" mb="4">
              {collection.description}
            </Dialog.Description>
            <Flex direction="row" gap="3" className={styles.keywords} wrap="wrap">
              {collection.keywords?.map((keyword) => (
                <Badge
                  key={keyword}
                  size="2"
                  color="gray"
                  className={styles.keyword}
                  variant="soft"
                >
                  {keyword}
                </Badge>
              ))}
            </Flex>
            <Flex justify="end" mt="4">
              <Button onClick={handleOpenCollection} className={styles.button}>
                Open Collection
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
