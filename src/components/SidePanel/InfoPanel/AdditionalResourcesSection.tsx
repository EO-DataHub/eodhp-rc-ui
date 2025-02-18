import React from 'react'
import { Flex, Text, Spinner, Link } from '@radix-ui/themes'
import type { Item } from '@/types'
import styles from './InfoPanel.module.scss'

interface AdditionalResourcesSectionProps {
  item: Item | null | undefined
  isLoading: boolean
  hasError: boolean
}

export const AdditionalResourcesSection: React.FC<AdditionalResourcesSectionProps> = ({
  item,
  isLoading,
  hasError,
}) => {
  const links = item?.links

  if (isLoading) {
    return (
      <Flex gap="3" align="center">
        <Spinner size="3" />
        <Text>Loading data...</Text>
      </Flex>
    )
  }

  if (hasError) {
    return <Text color="red">Error loading items!</Text>
  }

  if (!links || links.length === 0) {
    return <Text>No additional resources available.</Text>
  }

  return (
    <Flex direction="column" gap="5" className={styles.linkContainer}>
      <Flex direction="column" gap="3">
        {links.map((link, index) => (
          <Link
            href={link.href}
            target="_blank"
            underline="always"
            weight="medium"
            key={index}
            className={styles.link}
          >
            {link.rel}
          </Link>
        ))}
      </Flex>
    </Flex>
  )
}
