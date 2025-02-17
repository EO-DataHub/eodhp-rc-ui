import React from 'react'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Link } from '@radix-ui/themes'
import { getFormattedDateRange } from '@/library/dateUtils'
import styles from './SmallCollectionCard.module.scss'
import PoundSterlingSymbolIcon from '../../../../public/pound-sterling-symbol.svg?react'

export const SmallCollectionCard: React.FC = () => {
  const storedCollection = localStorage.getItem('selectedCollection')
  const selectedCollection = storedCollection ? JSON.parse(storedCollection) : null
  const dateInterval = selectedCollection?.extent?.temporal?.interval[0] ?? []

  return (
    <Card className={styles.card} size="2">
      <Flex direction="column">
        <Flex justify="between" align="center">
          <Text size="3" className={styles.text}>
            {selectedCollection?.title || 'No Collection Selected'}
          </Text>
          <Flex justify="end" gap="2">
            <IconButton radius="full" variant="solid" className={styles.button}>
              <PoundSterlingSymbolIcon />
            </IconButton>
            <IconButton radius="full" variant="solid" className={styles.button}>
              <InfoCircledIcon />
            </IconButton>
          </Flex>
        </Flex>
        <Text size="3" className={styles.text}>
          {getFormattedDateRange(dateInterval)}
        </Text>
        <Link href="/" size="1" mt="2" mb="4" className={styles.text}>
          Change Collection
        </Link>
      </Flex>
    </Card>
  )
}
