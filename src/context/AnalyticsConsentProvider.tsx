import React, { useEffect, useState } from 'react'
import { AnalyticsConsentContext } from '@/context/AnalyticsConsentContext'
import {
  AnalyticsConsentValue,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from '@/library/analyticsConsentCookie'

const BANNER_PROMPTED_SESSION_KEY = 'eodh_rc_analytics_banner_prompted'

const hasPromptedThisSession = () => {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(BANNER_PROMPTED_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

const markPromptedThisSession = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(BANNER_PROMPTED_SESSION_KEY, 'true')
}

export const AnalyticsConsentProvider = ({ children }: { children: React.ReactNode }) => {
  const [consent, setConsent] = useState<AnalyticsConsentValue>('unknown')
  const [isBannerOpen, setBannerOpen] = useState(false)

  useEffect(() => {
    const initialConsent = getAnalyticsConsent()
    setConsent(initialConsent)
    if (initialConsent === 'unknown') {
      setBannerOpen(true)
      return
    }

    if (initialConsent === 'denied' && !hasPromptedThisSession()) {
      setBannerOpen(true)
      markPromptedThisSession()
    }
  }, [])

  const grantConsent = () => {
    setAnalyticsConsent('granted')
    setConsent('granted')
    setBannerOpen(false)
    markPromptedThisSession()
  }

  const denyConsent = () => {
    setAnalyticsConsent('denied')
    setConsent('denied')
    setBannerOpen(false)
    markPromptedThisSession()
  }

  const openPreferences = () => setBannerOpen(true)

  return (
    <AnalyticsConsentContext.Provider
      value={{
        consent,
        isBannerOpen,
        grantConsent,
        denyConsent,
        openPreferences,
      }}
    >
      {children}
    </AnalyticsConsentContext.Provider>
  )
}
