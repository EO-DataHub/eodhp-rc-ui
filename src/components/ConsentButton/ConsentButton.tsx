import { CookieIcon } from '@radix-ui/react-icons'
import { useAnalyticsConsent } from '@/context/AnalyticsConsentContext'
import styles from './ConsentButton.module.scss'

export const ConsentButton = () => {
  const { consent, openPreferences } = useAnalyticsConsent()
  const isAccepted = consent === 'granted'

  return (
    <button
      type="button"
      className={`${styles.button} ${isAccepted ? styles.accepted : styles.pending}`}
      onClick={openPreferences}
      aria-label="Cookie settings"
      title="Cookie settings"
    >
      <CookieIcon aria-hidden="true" />
    </button>
  )
}
