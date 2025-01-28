import React from 'react'
import { Collection } from '@/types'
import { Dialog, Button, Flex, Text, TextField } from '@radix-ui/themes'
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
  console.log({ collection })
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Close>
          <Button
            variant="ghost"
            aria-label="Close"
            style={{ position: 'absolute', top: '15px', right: '20px' }}
          >
            <Cross1Icon />
          </Button>
        </Dialog.Close>
        <Dialog.Title>{collection.title}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {collection.description}
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Name
            </Text>
            <TextField.Root defaultValue="Freja Johnsen" placeholder="Enter your full name" />
          </label>
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Email
            </Text>
            <TextField.Root defaultValue="freja@example.com" placeholder="Enter your email" />
          </label>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button>Save</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
