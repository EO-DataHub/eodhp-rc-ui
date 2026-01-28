import { createContext, useContext } from 'react'
import type { AnalyticsConsentValue } from '@/library/analyticsConsentCookie'

export interface AnalyticsConsentContextValue {
  consent: AnalyticsConsentValue
  isBannerOpen: boolean
  grantConsent: () => void
  denyConsent: () => void
  openPreferences: () => void
}

export const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | undefined>(
  undefined,
)

export const useAnalyticsConsent = () => {
  const context = useContext(AnalyticsConsentContext)
  if (!context) {
    throw new Error('useAnalyticsConsent must be used within AnalyticsConsentProvider')
  }
  return context
}
