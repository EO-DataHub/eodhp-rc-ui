import { useEffect } from 'react'
import type { DataRouter } from 'react-router-dom'
import { initGA, safeSendPageView } from '@/library/googleAnalyticsClient'

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

export const useGoogleAnalytics = (router: DataRouter) => {
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    initGA(GA_MEASUREMENT_ID)

    safeSendPageView(window.location.pathname + window.location.search)

    const unsubscribe = router.subscribe((state) => {
      safeSendPageView(state.location.pathname + state.location.search)
    })

    return () => void unsubscribe()
  }, [router])
}
