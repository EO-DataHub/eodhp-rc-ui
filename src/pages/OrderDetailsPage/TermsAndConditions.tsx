import React from 'react'
import { Flex, Text, Checkbox, Link } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'

interface TermsAndConditionsContainerProps {
  provider: 'planet' | 'airbus_optical' | 'airbus_sar'
}

export const TermsAndConditionsContainer: React.FC<TermsAndConditionsContainerProps> = ({
  provider,
}) => {
  const airbusLicenseLink = 'https://space-solutions.airbus.com/legal/licences/'
  const airbusTermsLink = 'https://space-solutions.airbus.com/legal/terms-and-conditions/'

  // Base terms - no href link provided yet
  const termsAndConditionsInfo = [
    { text: 'I give consent for the EODH to place the order on my behalf.', link: '#' },
  ]

  if (provider !== 'planet') {
    termsAndConditionsInfo.unshift(
      { text: 'I have read and understand the product license.', link: airbusLicenseLink },
      {
        text: 'I have read and understand the vendor terms and conditions.',
        link: airbusTermsLink,
      },
    )
  }

  return (
    <Flex className={styles.conditionsContainer} direction="column" gap="3">
      {termsAndConditionsInfo.map((info, index) => (
        <Flex key={index} gap="3" className={styles.checkGroup}>
          <Checkbox className={styles.checkbox}></Checkbox>
          <Text>{info.text}</Text>
          <Link
            className={styles.linkText}
            href={info.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </Link>
        </Flex>
      ))}
    </Flex>
  )
}
