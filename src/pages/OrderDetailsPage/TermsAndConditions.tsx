import React from 'react'
import { Flex, Text, Checkbox, Link } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'

const termsAndConditionsInfo = [
  { text: 'I have read and understand the product license.', link: '#' },
  {
    text: ' have read and understand the vendor terms and conditions.',
    link: 'https://space-solutions.airbus.com/legal/terms-and-conditions/',
  },
  { text: 'I give consent for the EODH to place the order on my behalf.', link: '#' },
]

export const TermsAndConditionsContainer: React.FC = () => {
  return (
    <Flex className={styles.conditionsContainer} direction="column" gap="3">
      {termsAndConditionsInfo.map((info, index) => (
        <Flex key={index} gap="3" className={styles.checkGroup}>
          <Checkbox className={styles.checkbox}></Checkbox>
          <Text>{info.text}</Text>
          <Link className={styles.linkText} href={info.link}>
            Learn more
          </Link>
        </Flex>
      ))}
    </Flex>
  )
}
