import { Button, Card, Flex, Text } from '@radix-ui/themes'
import { useAnalyticsConsent } from '@/context/AnalyticsConsentContext'
import styles from './ConsentBanner.module.scss'

export const ConsentBanner = () => {
  const { isBannerOpen, grantConsent, denyConsent } = useAnalyticsConsent()

  if (!isBannerOpen) return null

  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Cookie consent">
      <Card className={styles.card}>
        <Flex direction="column" gap="3">
          <Text size="2" className={styles.text}>
            We use analytics cookies to understand how the site is used and to improve it. You can
            accept analytics cookies or reject them.
          </Text>
          <Flex gap="3" align="center" justify="end" className={styles.actions}>
            <Button variant="ghost" onClick={denyConsent}>
              Reject
            </Button>
            <Button onClick={grantConsent}>Accept</Button>
          </Flex>
        </Flex>
      </Card>
    </div>
  )
}
