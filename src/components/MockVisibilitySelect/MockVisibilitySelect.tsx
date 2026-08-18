import React, { useState } from 'react'
import { AlertDialog, Button, Flex, Select, Text } from '@radix-ui/themes'

type Visibility = 'public' | 'private'

const VISIBILITY_PREVIEW_NOTE = '(UI preview only — visibility will not actually change.)'

const readStored = (storageKey: string): Visibility =>
  localStorage.getItem(storageKey) === 'public' ? 'public' : 'private'

/**
 * There's no real visibility API yet (see docs/pending-backend-apis.md) — state is
 * stored in localStorage per storageKey so this can demo the intended UX without
 * calling any API. Picking a new value doesn't apply until confirmed; cancelling
 * snaps the select back to its previous value.
 */
export const MockVisibilitySelect: React.FC<{ storageKey: string; label: string }> = ({
  storageKey,
  label,
}) => {
  const [visibility, setVisibility] = useState<Visibility>(() => readStored(storageKey))
  const [pendingVisibility, setPendingVisibility] = useState<Visibility | null>(null)

  const handleConfirm = () => {
    if (!pendingVisibility) return
    localStorage.setItem(storageKey, pendingVisibility)
    setVisibility(pendingVisibility)
    setPendingVisibility(null)
  }

  return (
    <>
      <Select.Root
        value={visibility}
        onValueChange={(value) => {
          if (value !== visibility) setPendingVisibility(value as Visibility)
        }}
        size="1"
      >
        <Select.Trigger variant="soft" />
        <Select.Content position="popper">
          <Select.Item value="private">Private</Select.Item>
          <Select.Item value="public">Public</Select.Item>
        </Select.Content>
      </Select.Root>

      <AlertDialog.Root
        open={pendingVisibility !== null}
        onOpenChange={(open) => {
          if (!open) setPendingVisibility(null)
        }}
      >
        <AlertDialog.Content style={{ maxWidth: 420 }}>
          <AlertDialog.Title>Change visibility</AlertDialog.Title>
          <AlertDialog.Description size="2" mb="2">
            Make <strong>{label}</strong> {pendingVisibility}?{' '}
            {pendingVisibility === 'public'
              ? 'Anyone will be able to access it.'
              : 'It will no longer be accessible outside this workspace.'}
          </AlertDialog.Description>
          <Text size="1" color="red" as="p">
            {VISIBILITY_PREVIEW_NOTE}
          </Text>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" onClick={handleConfirm}>
                Confirm
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  )
}
