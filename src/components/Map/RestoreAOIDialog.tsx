import { RestoreAOIContext } from '@/context/RestoreAOIContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { Button, Dialog, Flex } from '@radix-ui/themes'
import { useContext, useEffect } from 'react'
import styles from './RestoreAOIDialog.module.scss'

const AOI_STORAGE_KEY = 'aoiData'
const PROMPT_SESSION_KEY = 'aoiPromptShown'

export const RestoreAOIDialog = () => {
  const { shouldShowRestoreAOIDialog, setShouldShowRestoreAOIDialog, hasPromptedRef } =
    useContext(RestoreAOIContext)

  useEffect(() => {
    // make sure only prompt once even if the component is remounted
    if (hasPromptedRef?.current) {
      return
    }

    // Check if we've already shown the prompt this session
    const hasBeenPrompted = sessionStorage.getItem(PROMPT_SESSION_KEY)
    const storedAoi = localStorage.getItem(AOI_STORAGE_KEY)

    if (storedAoi && !hasBeenPrompted) {
      // New session with stored AOI - show the prompt
      setShouldShowRestoreAOIDialog(true)
    } else if (storedAoi && hasBeenPrompted) {
      // Session already prompted, let automatic restoration handle it
      // The existing useTerraDraw logic will restore the AOI automatically
    }

    if (hasPromptedRef) {
      hasPromptedRef.current = true
    }
  }, [hasPromptedRef, setShouldShowRestoreAOIDialog])

  const restoreAOI = () => {
    // Mark that we've shown the prompt this session
    sessionStorage.setItem(PROMPT_SESSION_KEY, 'true')

    // Close the dialog - the existing automatic restoration logic will handle the rest
    setShouldShowRestoreAOIDialog(false)
  }

  const removeAOI = () => {
    // Mark that we've shown the prompt this session
    sessionStorage.setItem(PROMPT_SESSION_KEY, 'true')

    // Remove AOI from both localStorage and store
    localStorage.removeItem(AOI_STORAGE_KEY)
    dataFinderStore.send({ type: 'storeAoi', aoi: undefined })

    // Clear any existing TerraDraw features
    const terradrawInstance = dataFinderStore.getSnapshot().context.terradrawInstance
    if (terradrawInstance) {
      terradrawInstance.clear()
    }

    setShouldShowRestoreAOIDialog(false)
  }

  return (
    <Dialog.Root open={shouldShowRestoreAOIDialog}>
      <Dialog.Content maxWidth="450px" className={styles.dialogContent}>
        <Dialog.Title>Restore Area of Interest</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Would you like to reload the Area of Interest from your previous visit?
        </Dialog.Description>

        <Flex direction="column" gap="3"></Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" onClick={removeAOI} className={styles.cancelButton}>
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={restoreAOI} className={styles.button}>
              Restore
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
