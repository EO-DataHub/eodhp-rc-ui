import React, { useEffect, useState } from 'react'
import { AlertDialog, Button, Dialog, Flex, Text, TextArea, TextField } from '@radix-ui/themes'
import { useSavedSetMutations } from '@/hooks/useSavedSets'
import {
  MAX_SET_DESCRIPTION_LENGTH,
  MAX_SET_NAME_LENGTH,
  type SavedSetSummary,
} from '@/services/savedSetsService'

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

/** Renames a set or changes its description. */
export const EditSavedSetDialog: React.FC<{
  set?: SavedSetSummary
  onClose: () => void
}> = ({ set, onClose }) => {
  const { update } = useSavedSetMutations()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!set) return
    setName(set.name)
    setDescription(set.description ?? '')
    update.reset()
    // Only reset when a different set is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id])

  const trimmedName = name.trim()
  const save = () => {
    if (!set) return
    update.mutate(
      { setId: set.id, payload: { name: trimmedName, description: description.trim() } },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog.Root open={Boolean(set)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Edit set</Dialog.Title>
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="edit-set-name">
              Name
            </Text>
            <TextField.Root
              id="edit-set-name"
              value={name}
              maxLength={MAX_SET_NAME_LENGTH}
              onChange={(e) => setName(e.target.value)}
            />
          </Flex>
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="edit-set-description">
              Description{' '}
              <Text size="1" color="gray" weight="regular">
                optional
              </Text>
            </Text>
            <TextArea
              id="edit-set-description"
              value={description}
              maxLength={MAX_SET_DESCRIPTION_LENGTH}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Flex>
          {update.isError && (
            <Text size="2" color="red">
              {errorText(update.error)}
            </Text>
          )}
        </Flex>
        <Flex justify="end" gap="3" mt="5">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button disabled={!trimmedName || update.isPending} onClick={save}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

/** Deletes a set for everyone in the workspace. The items themselves are not affected. */
export const DeleteSavedSetDialog: React.FC<{
  set?: SavedSetSummary
  onClose: () => void
  onDeleted?: () => void
}> = ({ set, onClose, onDeleted }) => {
  const { remove } = useSavedSetMutations()

  useEffect(() => {
    if (set) remove.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id])

  return (
    <AlertDialog.Root open={Boolean(set)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Content maxWidth="460px">
        <AlertDialog.Title>Delete set</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Delete <strong>{set?.name}</strong> for everyone in this workspace? The items themselves
          are not affected. This can&apos;t be undone.
        </AlertDialog.Description>
        {remove.isError && (
          <Text as="p" size="2" color="red" mt="3">
            {errorText(remove.error)}
          </Text>
        )}
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <Button
            color="red"
            disabled={remove.isPending || !set}
            onClick={() =>
              set &&
              remove.mutate(
                { setId: set.id },
                {
                  onSuccess: () => {
                    onClose()
                    onDeleted?.()
                  },
                },
              )
            }
          >
            {remove.isPending ? 'Deleting…' : 'Delete set'}
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  )
}
