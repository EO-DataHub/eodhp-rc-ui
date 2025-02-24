import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Collection } from '@/types'
import { Dialog, Button, Flex, Text, Inset, Badge, Link } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import styles from './CollectionDetailsCard.module.scss'
import { getFormattedDateRange } from '@/library/dateUtils'
import DefaultThumbnail from '../../../public/default-thumbnail-square.jpg'
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
    // persist selected collection even after a page reload or browser restart
    localStorage.setItem('selectedCollection', JSON.stringify(collection))
    navigate(`/finder/${collection.id}`)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="750px" className={styles.dialogContent}>
        <Dialog.Close>
          <Button variant="ghost" aria-label="Close" className={styles.closeButton}>
            <Cross1Icon />
          </Button>
        </Dialog.Close>
        <Flex direction="row" gap="7" className={styles.flexContainer}>
          <Flex>
            <Inset>
              <img
                src={thumbnailUrl}
                alt="Collection thumbnail"
                className={styles.thumbnail}
                onError={handleImageError}
              />
            </Inset>
          </Flex>
          <Flex direction="column" className={styles.details}>
            <Dialog.Title className={styles.dialogTitle}>{collection.title}</Dialog.Title>
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
              <Link
                size="2"
                href=""
                onClick={handleOpenCollection}
                aria-label={`Open ${collection.title} collection`}
                className={styles.link}
              >
                Open Collection
              </Link>
            </Flex>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
