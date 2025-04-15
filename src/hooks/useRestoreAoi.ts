import { useContext, useEffect } from 'react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { RestoreAOIContext } from '@/context/RestoreAOIContext'

const AOI_STORAGE_KEY = 'aoiData'

export function useRestoreAoi() {
  const { hasPromptedRef, shouldShowRestoreAOIDialog, setShouldShowRestoreAOIDialog } =
    useContext(RestoreAOIContext)

  useEffect(() => {
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
  }, [hasPromptedRef, setShouldShowRestoreAOIDialog, shouldShowRestoreAOIDialog])
}
