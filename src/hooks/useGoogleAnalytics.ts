import { useEffect } from 'react'
import type { DataRouter } from 'react-router-dom'
import { initGA, safeSendPageView } from '@/library/googleAnalyticsClient'
import { useAnalyticsConsent } from '@/context/AnalyticsConsentContext'

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

export const useGoogleAnalytics = (router: DataRouter) => {
  const { consent } = useAnalyticsConsent()

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return
    if (consent !== 'granted') return

    initGA(GA_MEASUREMENT_ID)

    safeSendPageView(window.location.pathname + window.location.search)

    const unsubscribe = router.subscribe((state) => {
      safeSendPageView(state.location.pathname + state.location.search)
    })

    return () => void unsubscribe()
  }, [router, consent])
}
