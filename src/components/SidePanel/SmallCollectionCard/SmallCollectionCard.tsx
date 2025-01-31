import React from 'react'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Link } from '@radix-ui/themes'
import styles from './SmallCollectionCard.module.scss'
import PoundSterlingSymbolIcon from '../../../../public/pound-sterling-symbol.svg?react'

export const SmallCollectionCard: React.FC = () => {
  return (
    <Card className={styles.card} size="2">
      <Flex direction="column">
        <Flex justify="between" align="center">
          <Text size="3" className={styles.text}>
            Airbus SAR Data
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
          11/19/2007 - 12/5/2024
        </Text>
        <Link href="/" size="1" mt="2" mb="4" className={styles.text}>
          Change Collection
        </Link>
      </Flex>
    </Card>
  )
}
