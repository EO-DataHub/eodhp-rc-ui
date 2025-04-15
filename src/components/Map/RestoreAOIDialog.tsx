import { RestoreAOIContext } from '@/context/RestoreAOIContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { Button, Dialog, Flex } from '@radix-ui/themes'
import { useContext, useEffect } from 'react'
import styles from './RestoreAOIDialog.module.scss'

const AOI_STORAGE_KEY = 'aoiData'

export const RestoreAOIDialog = () => {
  const { shouldShowRestoreAOIDialog, setShouldShowRestoreAOIDialog, hasPromptedRef } =
    useContext(RestoreAOIContext)

  useEffect(() => {
    // make sure only prompt once even if the component is remounted
    if (hasPromptedRef?.current) {
      return
    }

    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const isNewTab = navEntries[0]?.type === 'navigate'
    const storedAoi = localStorage.getItem(AOI_STORAGE_KEY)

    if (storedAoi) {
      if (isNewTab) {
        setShouldShowRestoreAOIDialog(true)
      } else {
        // tab already open, simply restore the AOI if it exists
        const parsedAoi = JSON.parse(storedAoi)
        dataFinderStore.send({ type: 'storeAoi', aoi: parsedAoi })
      }
    }

    if (hasPromptedRef) {
      hasPromptedRef.current = true
    }
  }, [hasPromptedRef, setShouldShowRestoreAOIDialog])

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
