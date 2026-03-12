import React, { useRef } from 'react'
import { Dialog, Button, Flex, Text, TextField } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import { toast } from 'react-toastify'
import styles from './SharePermalinkModal.module.scss'

interface SharePermalinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title?: string
  description?: string
  itemsIncluded?: number | null
  totalItems?: number | null
}

export const SharePermalinkModal: React.FC<SharePermalinkModalProps> = ({
  open,
  onOpenChange,
  url,
  title = 'Share this view',
  description = 'This link opens the map with the current pinned items and map view.',
  itemsIncluded,
  totalItems,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Failed to copy link'),
    )
  }

  const omitted =
    typeof totalItems === 'number' && typeof itemsIncluded === 'number'
      ? totalItems - itemsIncluded
      : 0

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
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
        <Flex direction="column" className={styles.flexContainer} gap="3">
          <Dialog.Title className={styles.dialogTitle}>{title}</Dialog.Title>
          <Dialog.Description>
            <Text as="span" size="2" color="gray">
              {description}
            </Text>
          </Dialog.Description>
          <Flex direction="column" gap="2">
            <Text size="2">Link</Text>
            <TextField.Root readOnly value={url} size="2">
              <TextField.Slot>
                <Button
                  type="button"
                  size="1"
                  variant="soft"
                  onClick={handleCopy}
                  aria-label="Copy link"
                >
                  Copy URL
                </Button>
              </TextField.Slot>
            </TextField.Root>
            {omitted > 0 && (
              <Text size="1" color="gray">
                Only the first {itemsIncluded} item{itemsIncluded === 1 ? '' : 's'} are included to
                keep the URL within browser length limits. {omitted} item
                {omitted === 1 ? '' : 's'} omitted.
              </Text>
            )}
          </Flex>
          <Flex justify="end" gap="3" mt="3">
            <Button onClick={() => onOpenChange(false)} color="gray" variant="soft">
              Close
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
