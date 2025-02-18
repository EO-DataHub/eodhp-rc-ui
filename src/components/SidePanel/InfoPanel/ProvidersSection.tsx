import React from 'react'
import { Flex, Text, Spinner, Link, Badge } from '@radix-ui/themes'
import type { Collection } from '@/types'
import styles from './InfoPanel.module.scss'

interface ProvidersSectionProps {
  providers: Collection['providers'] | null | undefined
  isLoading?: boolean
  hasError?: boolean
}

export const ProvidersSection: React.FC<ProvidersSectionProps> = ({
  providers,
  isLoading = false,
  hasError = false,
}) => {
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

  if (!providers || providers.length === 0) {
    return <Text>No providers available.</Text>
  }

  return (
    <Flex direction="column" gap="5" className={styles.linkContainer}>
      <Flex direction="column" gap="3">
        {providers.map((provider, index) => (
          <Flex key={index} gap="4" align="center">
            <Link
              href={provider.url}
              target="_blank"
              underline="always"
              weight="medium"
              className={styles.link}
            >
              {provider.name}
            </Link>

            <Flex direction="row" wrap="wrap" gap="2">
              {provider.roles?.map((role) => (
                <Badge color="gray" key={role} radius="full">
                  {role}
                </Badge>
              ))}
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Flex>
  )
}
