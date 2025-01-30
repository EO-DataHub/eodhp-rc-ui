import React from 'react'
import { Collection } from '@/types'
import { Dialog, Button, Flex, Text, Inset, Kbd, Link } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'

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
  const dateInterval = collection?.extent?.temporal?.interval[0]

  const getFormattedDateRange = (interval: any): string => {
    if (!Array.isArray(interval) || interval.length !== 2) {
      return 'Invalid Date Range'
    }

    const [startDateStr, endDateStr] = interval

    const startDate = new Date(startDateStr)
    if (isNaN(startDate.getTime())) {
      return 'Invalid Date Range'
    }

    const endDate = new Date(endDateStr)
    if (isNaN(endDate.getTime())) {
      return 'Invalid Date Range'
    }

    if (!endDateStr) {
      return `${startDate.toLocaleDateString('en-GB')} to present`
    }

    return `${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="750px" style={{ borderRadius: '0px' }}>
        <Dialog.Close>
          <Button
            variant="ghost"
            aria-label="Close"
            style={{ position: 'absolute', top: '15px', right: '20px' }}
          >
            <Cross1Icon />
          </Button>
        </Dialog.Close>
        <Flex direction="row" gap="7" style={{ padding: '1em' }}>
          <Flex>
            <Inset>
              <img
                src="../../../public/placeholder-img.png"
                style={{
                  display: 'block',
                  objectFit: 'cover',
                  width: 210,
                  height: 210,
                  backgroundColor: 'var(--gray-5)',
                }}
              />
            </Inset>
          </Flex>
          <Flex direction="column" style={{ width: '100%' }}>
            <Dialog.Title style={{ marginTop: '-1.1em' }}>{collection.title}</Dialog.Title>
            <Text size="2" color="gray" mb="2">
              {getFormattedDateRange(dateInterval)}
            </Text>
            <Dialog.Description size="2" mb="4">
              {collection.description}
            </Dialog.Description>
            <Flex direction="row" gap="3" style={{ flexWrap: 'wrap' }}>
              {collection.keywords?.map((keyword) => (
                <Kbd size="2" style={{ borderRadius: '12px' }}>
                  {keyword}
                </Kbd>
              ))}
            </Flex>
            <Flex style={{ marginTop: '1em', justifyContent: 'flex-end' }}>
              <Link size="1" href="#">
                Open Collection
              </Link>
            </Flex>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
