import { AlertDialog, Button, Flex } from '@radix-ui/themes'
import demoStore from '../demoStore'
import type { SavedSet } from '../demoTypes'

export const DeleteSetDialog = ({
  set,
  onClose,
  onDeleted,
}: {
  set?: SavedSet
  onClose: () => void
  onDeleted?: () => void
}) => (
  <AlertDialog.Root open={!!set} onOpenChange={(open) => !open && onClose()}>
    <AlertDialog.Content maxWidth="440px">
      <AlertDialog.Title>Delete &apos;{set?.name}&apos;?</AlertDialog.Title>
      <AlertDialog.Description size="2">
        The set is removed for everyone in the workspace. The items themselves, and any workflow
        results made from the set, are not affected.
      </AlertDialog.Description>
      <Flex gap="3" mt="4" justify="end">
        <AlertDialog.Cancel>
          <Button variant="soft" color="gray">
            Cancel
          </Button>
        </AlertDialog.Cancel>
        <AlertDialog.Action>
          <Button
            color="red"
            onClick={() => {
              if (!set) return
              demoStore.send({ type: 'removeSet', setId: set.id })
              onDeleted?.()
            }}
          >
            Delete set
          </Button>
        </AlertDialog.Action>
      </Flex>
    </AlertDialog.Content>
  </AlertDialog.Root>
)
