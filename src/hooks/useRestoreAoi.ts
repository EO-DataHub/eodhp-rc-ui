import { useEffect, useRef } from 'react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

const AOI_STORAGE_KEY = 'aoiData'

export function useRestoreAoi() {
  const hasPromptedRef = useRef(false)

  useEffect(() => {
    if (hasPromptedRef.current) return

    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const isNewTab = navEntries[0]?.type === 'navigate'
    const storedAoi = localStorage.getItem(AOI_STORAGE_KEY)

    if (storedAoi) {
      if (isNewTab) {
        const parsedAoi = JSON.parse(storedAoi)
        const shouldRestore = window.confirm(
          'Would you like to reload the Area of Interest from your previous visit?',
        )
        if (shouldRestore) {
          dataFinderStore.send({ type: 'storeAoi', aoi: parsedAoi })
        } else {
          localStorage.removeItem(AOI_STORAGE_KEY)
        }
      } else {
        // tab already open, simply restore the AOI if it exists
        const parsedAoi = JSON.parse(storedAoi)
        dataFinderStore.send({ type: 'storeAoi', aoi: parsedAoi })
      }
    }
    hasPromptedRef.current = true
  }, [])
}
