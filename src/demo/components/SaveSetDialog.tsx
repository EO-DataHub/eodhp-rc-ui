import { useEffect, useState } from 'react'
import { Button, Dialog, Flex, Text, TextArea, TextField } from '@radix-ui/themes'
import { toast } from 'react-toastify'
import type { Item } from '@/types'
import demoStore from '../demoStore'
import { DEMO_USER } from '../mockData'
import { DemoBadge } from './DemoBadge'

interface SaveSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Item[]
  workspace: string
}

export const SaveSetDialog = ({ open, onOpenChange, items, workspace }: SaveSetDialogProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
    }
  }, [open])

  const save = () => {
    const now = new Date().toISOString()
    demoStore.send({
      type: 'addSet',
      set: {
        id: `set-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        workspace,
        createdBy: DEMO_USER,
        createdAt: now,
        updatedAt: now,
        items: items.map((item) => ({
          id: item.id,
          collection: item.collection,
          datetime: item.properties.datetime,
          pinned: item,
        })),
      },
    })
    toast.success(`Saved '${name.trim()}' with ${items.length} items to ${workspace}`, {
      autoClose: 4000,
    })
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="480px">
        <Flex justify="between" align="start">
          <Dialog.Title>Save pinned items as a set</Dialog.Title>
          <DemoBadge />
        </Flex>
        <Dialog.Description size="2" color="gray" mb="4">
          Saves these {items.length} items to <strong>{workspace}</strong>, so everyone in the
          workspace can open them, run workflows on them, or load them in Jupyter and QGIS. Your
          pinned items stay as they are.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="set-name">
              Name
            </Text>
            <TextField.Root
              id="set-name"
              value={name}
              placeholder="e.g. Thames estuary, summer 2025"
              onChange={(e) => setName(e.target.value)}
            />
          </Flex>
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="set-description">
              Description{' '}
              <Text size="1" color="gray" weight="regular">
                optional
              </Text>
            </Text>
            <TextArea
              id="set-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Flex>
        </Flex>

        <Flex justify="end" gap="3" mt="5">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button disabled={!name.trim() || items.length === 0} onClick={save}>
            Save set
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
