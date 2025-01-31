import React from 'react'
import { Collection } from '@/types'
import { Dialog, Button, Flex, Text, Inset, Kbd, Link } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import styles from './CollectionDetailsCard.module.scss'

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

  const thumbnailUrl =
    typeof collection.assets?.thumbnail === 'string'
      ? collection.assets.thumbnail
      : '../../../public/placeholder-img.png'

  const getFormattedDateRange = (interval: (string | null)[]): string => {
    if (!Array.isArray(interval) || interval.length !== 2) return 'Invalid Date Range'

    const [startDateStr, endDateStr] = interval

    const startDate = new Date(startDateStr ?? '')
    if (isNaN(startDate.getTime())) return 'Invalid Date Range'

    const endDate = endDateStr ? new Date(endDateStr) : new Date()
    if (isNaN(endDate.getTime())) return 'Invalid Date Range'

    return `${startDate.toLocaleDateString('en-GB')} - ${endDateStr ? endDate.toLocaleDateString('en-GB') : 'present'}`
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
              <img src={thumbnailUrl} alt="Collection thumbnail" className={styles.thumbnail} />
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
            <Flex direction="row" gap="3" style={{ flexWrap: 'wrap' }}>
              {collection.keywords?.map((keyword) => (
                <Kbd key={keyword} size="2" className={styles.keyword}>
                  {keyword}
                </Kbd>
              ))}
            </Flex>
            <Flex className={styles.linkWrapper}>
              <Link size="1" href="#" aria-label={`Open ${collection.title} collection`}>
                Open Collection
              </Link>
            </Flex>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
