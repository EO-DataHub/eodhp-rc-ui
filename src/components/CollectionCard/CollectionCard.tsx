import React from 'react'
import { Collection } from '@/types'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, Inset, IconButton } from '@radix-ui/themes'
import styles from './CollectionCard.module.scss'
import PoundSterlingSymbolIcon from '../../../public/pound-sterling-symbol.svg?react'

interface CollectionCardProps {
  collection: Collection
}

export const CollectionCard: React.FC<CollectionCardProps> = ({ collection }) => {
  return (
    <Card size="2" className={styles.card}>
      <Inset clip="padding-box" side="top" pb="current">
        <img
          src="../../../public/default-thumbnail.jpg"
          style={{
            display: 'block',
            objectFit: 'cover',
            width: '100%',
            height: 140,
            backgroundColor: 'var(--gray-5)',
          }}
        />
      </Inset>
      <Flex justify="end" mt="-6" gap="2">
        <IconButton radius="full" variant="solid" className={styles.button}>
          <PoundSterlingSymbolIcon width="18" height="18" />
        </IconButton>
        <IconButton radius="full" variant="solid" className={styles.button}>
          <InfoCircledIcon width="25" height="25" />
        </IconButton>
      </Flex>
      <Text as="p" size="3" className={styles.text}>
        {collection.title}
      </Text>
      <Text as="p" size="3" className={styles.text}>
        {collection.extent.temporal.interval}
      </Text>
    </Card>
  )
}
