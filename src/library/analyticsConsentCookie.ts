export const ANALYTICS_CONSENT_COOKIE = 'eodh_rc_analytics_consent'
const SECONDS_PER_DAY = 60 * 60 * 24
const ANALYTICS_CONSENT_MAX_AGE_DAYS = 180
export const ANALYTICS_CONSENT_MAX_AGE_SECONDS = SECONDS_PER_DAY * ANALYTICS_CONSENT_MAX_AGE_DAYS

export type AnalyticsConsentValue = 'granted' | 'denied' | 'unknown'

const readCookie = (name: string) => {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.split('=')
    if (cookieName === name) {
      return rest.join('=')
    }
  }
  return null
}

export const getAnalyticsConsent = (): AnalyticsConsentValue => {
  const value = readCookie(ANALYTICS_CONSENT_COOKIE)
  if (value === 'granted' || value === 'denied') {
    return value
  }
  return 'unknown'
}

export const setAnalyticsConsent = (value: Exclude<AnalyticsConsentValue, 'unknown'>) => {
  if (typeof document === 'undefined') return

  const secureFlag =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureFlag}`
}

export const isAnalyticsConsentGranted = () => getAnalyticsConsent() === 'granted'
