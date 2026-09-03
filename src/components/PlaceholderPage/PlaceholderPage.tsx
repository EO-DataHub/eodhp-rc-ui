import React from 'react'
import { Flex, Text } from '@radix-ui/themes'
import styles from './PlaceholderPage.module.scss'

interface PlaceholderPageProps {
  title: string
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <Flex align="center" justify="center" className={styles.container}>
      <Text size="3" color="gray">
        {title} — coming soon
      </Text>
    </Flex>
  )
}
