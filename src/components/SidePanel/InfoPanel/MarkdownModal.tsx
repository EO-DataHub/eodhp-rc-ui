import React from 'react'
import { Dialog, Button, Flex } from '@radix-ui/themes'
import ReactMarkdown from 'react-markdown'

interface MarkdownModalProps {
  open: boolean
  onClose: () => void
  title: string
  markdown: string
}

const MarkdownModal: React.FC<MarkdownModalProps> = ({ open, onClose, title, markdown }) => (
  <Dialog.Root open={open} onOpenChange={onClose}>
    <Dialog.Content maxWidth="600px">
      <Dialog.Title>{title}</Dialog.Title>
      <Flex
        direction="column"
        gap="4"
        style={{ maxHeight: '60vh', overflowY: 'auto', margin: '1rem 0' }}
      >
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </Flex>
      <Flex justify="end" mt="4">
        <Dialog.Close>
          <Button variant="soft" color="gray" onClick={onClose}>
            Close
          </Button>
        </Dialog.Close>
      </Flex>
    </Dialog.Content>
  </Dialog.Root>
)

export default MarkdownModal
