import { RestoreAOIContext } from '@/context/RestoreAOIContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { Button, Dialog, Flex } from '@radix-ui/themes'
import { useContext } from 'react'

const AOI_STORAGE_KEY = 'aoiData'

export const RestoreAOIDialog = () => {
  const { shouldShowRestoreAOIDialog, setShouldShowRestoreAOIDialog } =
    useContext(RestoreAOIContext)

  const restoreAOI = () => {
    const storedAoi = localStorage.getItem(AOI_STORAGE_KEY)
    if (storedAoi) {
      const parsedAoi = JSON.parse(storedAoi)
      dataFinderStore.send({ type: 'storeAoi', aoi: parsedAoi })
    }
    setShouldShowRestoreAOIDialog(false)
  }

  const removeAOI = () => {
    localStorage.removeItem(AOI_STORAGE_KEY)
    dataFinderStore.send({ type: 'storeAoi', aoi: undefined })
    dataFinderStore.send({ type: 'drawDelete' })
    setShouldShowRestoreAOIDialog(false)
  }

  return (
    <Dialog.Root open={shouldShowRestoreAOIDialog}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Make changes to your profile.
        </Dialog.Description>

        <Flex direction="column" gap="3"></Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" onClick={removeAOI}>
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={restoreAOI}>Save</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
