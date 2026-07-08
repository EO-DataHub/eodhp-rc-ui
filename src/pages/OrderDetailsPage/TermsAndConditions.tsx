import React, { useState, useEffect } from 'react'
import { Flex, Text, Checkbox, Link } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'

interface TermsAndConditionsProps {
  provider: 'planet' | 'airbus_optical' | 'airbus_sar' | 'open-cosmos'
  onTermsChange: (allChecked: boolean) => void
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  provider,
  onTermsChange,
}) => {
  const airbusLicenseLink = 'https://space-solutions.airbus.com/legal/licences/'
  const airbusTermsLink = 'https://space-solutions.airbus.com/legal/terms-and-conditions/'

  const baseTerms = [
    {
      text: 'I give consent for the Earth Observation Data Hub to place the order on my behalf.',
      link: '',
    },
    {
      text: 'I understand this order cannot be cancelled once it has been placed.',
      link: '',
    },
  ]

  if (provider === 'airbus_optical' || provider === 'airbus_sar') {
    baseTerms.unshift(
      { text: 'I have read and understand the product license.', link: airbusLicenseLink },
      {
        text: 'I have read and understand the vendor terms and conditions.',
        link: airbusTermsLink,
      },
    )
  }
  // TODO: add Open Cosmos T&C link when available

  const [checkedTerms, setCheckedTerms] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const allChecked =
      Object.keys(checkedTerms).length === baseTerms.length &&
      Object.values(checkedTerms).every((checked) => checked)

    onTermsChange(allChecked)
  }, [checkedTerms, baseTerms.length, onTermsChange])

  const handleCheckboxChange = (index: number, checked: boolean) => {
    setCheckedTerms((prev) => ({ ...prev, [index]: checked }))
  }

  return (
    <Flex className={styles.conditionsContainer} direction="column" gap="3">
      {baseTerms.map((info, index) => (
        <Flex key={index} gap="3" className={styles.checkGroup}>
          <Checkbox
            className={styles.checkbox}
            checked={checkedTerms[index] || false}
            onCheckedChange={(checked) => handleCheckboxChange(index, Boolean(checked))}
          />
          <Flex>
            <Text size="2">
              {info.text}
              <span className={styles.asterisk}>*</span>{' '}
              {info.link && (
                <Link
                  className={styles.linkText}
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more
                </Link>
              )}
            </Text>
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}
