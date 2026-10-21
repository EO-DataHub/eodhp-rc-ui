import React, { useContext, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  Flex,
  SegmentedControl,
  Select,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useCanEditSavedSet, useSavedSetMutations, useSavedSets } from '@/hooks/useSavedSets'
import { toSavedSetItemInputs } from '@/library/savedSetItems'
import { MAX_SET_DESCRIPTION_LENGTH, MAX_SET_NAME_LENGTH } from '@/services/savedSetsService'
import type { Item } from '@/types'

export type SaveToSetMode = 'new' | 'existing'

interface SaveToSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Item[]
  initialMode: SaveToSetMode
}

/** Saves items as a new set, or adds them to a set the user can edit. */
export const SaveToSetDialog: React.FC<SaveToSetDialogProps> = ({
  open,
  onOpenChange,
  items,
  initialMode,
}) => {
  const { currentWorkspace } = useContext(AuthenticationContext)
  const { data: sets, isLoading: isSetsQueryLoading } = useSavedSets(open)
  const { canEdit, isLoading: isPermissionsLoading } = useCanEditSavedSet()
  const { create, addItems } = useSavedSetMutations()
  // Admins can add to any set, so wait for the admin list before deciding which sets to offer.
  const isSetsLoading = isSetsQueryLoading || isPermissionsLoading

  const [mode, setMode] = useState<SaveToSetMode>(initialMode)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [setId, setSetId] = useState<string>()

  const editableSets = (sets ?? []).filter(canEdit)
  const { inputs, skipped, merged } = useMemo(() => toSavedSetItemInputs(items), [items])
  const mutation = mode === 'new' ? create : addItems

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setName('')
    setDescription('')
    setSetId(undefined)
    create.reset()
    addItems.reset()
    // Only reset when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const itemsLabel = items.length === 1 ? 'this item' : `these ${items.length} items`
  const trimmedName = name.trim()
  const canSubmit =
    inputs.length > 0 &&
    !mutation.isPending &&
    (mode === 'new' ? trimmedName.length > 0 : Boolean(setId))

  const submit = () => {
    if (mode === 'new') {
      create.mutate(
        { name: trimmedName, description: description.trim(), items: inputs },
        {
          onSuccess: (set) => {
            toast.success(
              `Saved '${set.name}' with ${set.itemCount} ${set.itemCount === 1 ? 'item' : 'items'}`,
              { autoClose: 4000 },
            )
            onOpenChange(false)
          },
        },
      )
      return
    }
    if (!setId) return
    addItems.mutate(
      { setId, items: inputs },
      {
        onSuccess: ({ set, added }) => {
          toast.success(
            added === 0
              ? `'${set.name}' already has ${itemsLabel}`
              : `Added ${added} ${added === 1 ? 'item' : 'items'} to '${set.name}'`,
            { autoClose: 4000 },
          )
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>{mode === 'new' ? 'Save as set' : 'Add to set'}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {mode === 'new'
            ? `Saves ${itemsLabel} to ${currentWorkspace}, so everyone in the workspace can open them.`
            : `Adds ${itemsLabel} to a saved set in ${currentWorkspace}. Items already in the set are skipped.`}{' '}
          Your pinned items stay as they are.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <SegmentedControl.Root
            value={mode}
            onValueChange={(value) => setMode(value as SaveToSetMode)}
          >
            <SegmentedControl.Item value="new">New set</SegmentedControl.Item>
            <SegmentedControl.Item value="existing">Existing set</SegmentedControl.Item>
          </SegmentedControl.Root>

          {mode === 'new' ? (
            <>
              <Flex direction="column" gap="1">
                <Text as="label" size="2" weight="medium" htmlFor="saved-set-name">
                  Name
                </Text>
                <TextField.Root
                  id="saved-set-name"
                  value={name}
                  maxLength={MAX_SET_NAME_LENGTH}
                  placeholder="e.g. Thames estuary, summer 2025"
                  onChange={(e) => setName(e.target.value)}
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text as="label" size="2" weight="medium" htmlFor="saved-set-description">
                  Description{' '}
                  <Text size="1" color="gray" weight="regular">
                    optional
                  </Text>
                </Text>
                <TextArea
                  id="saved-set-description"
                  value={description}
                  maxLength={MAX_SET_DESCRIPTION_LENGTH}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Flex>
            </>
          ) : (
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium" htmlFor="saved-set-target">
                Set
              </Text>
              {!isSetsLoading && editableSets.length === 0 ? (
                <Text size="2" color="gray">
                  There are no sets you can add to in this workspace. Choose New set to make one.
                </Text>
              ) : (
                <Select.Root value={setId} onValueChange={setSetId} disabled={isSetsLoading}>
                  <Select.Trigger
                    id="saved-set-target"
                    placeholder={isSetsLoading ? 'Loading sets…' : 'Choose a set'}
                  />
                  <Select.Content position="popper">
                    {editableSets.map((set) => (
                      <Select.Item key={set.id} value={set.id}>
                        {set.name} ({set.itemCount})
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            </Flex>
          )}

          {skipped > 0 && (
            <Text size="2" color="orange">
              {skipped} of {items.length} {items.length === 1 ? 'item' : 'items'}{' '}
              {skipped === 1 ? 'has' : 'have'} no link to load {skipped === 1 ? 'it' : 'them'} from,
              so {skipped === 1 ? 'it' : 'they'} won&apos;t be saved.
            </Text>
          )}
          {merged > 0 && (
            <Text size="2" color="gray">
              {merged === 1 ? '1 item is' : `${merged} items are`} pinned with more than one render.
              A set holds each item once, with the first render.
            </Text>
          )}
          {mutation.isError && (
            <Text size="2" color="red">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Something went wrong. Please try again.'}
            </Text>
          )}
        </Flex>

        <Flex justify="end" gap="3" mt="5">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button disabled={!canSubmit} onClick={submit}>
            {mutation.isPending ? 'Saving…' : mode === 'new' ? 'Save set' : 'Add to set'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
