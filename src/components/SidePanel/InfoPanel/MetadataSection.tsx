import React, { useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import type { Item, Collection, MetadataItem } from '@/types'
import { MetadataTable } from './MetadataTable'
import { CubeMetadataTable } from './CubeMetadataTable'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { getStacMetadata } from '@/library/getStacMetadata'

interface MetadataSectionProps {
  stacElement: Item | Collection | null | undefined
  isLoading: boolean
  hasError: boolean
  ignoredFields?: string[]
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({
  stacElement,
  isLoading,
  hasError,
  ignoredFields = [],
}) => {
  const metadata: MetadataItem[] = useMemo(() => {
    return stacElement ? getStacMetadata(stacElement, ignoredFields) : []
  }, [stacElement, ignoredFields])

  if (isLoading) {
    return (
      <Flex gap="3" align="center">
        <LoadingIndicator size="3" />
        <Text>Loading data...</Text>
      </Flex>
    )
  }

  if (hasError) {
    return <Text color="red">Error loading items!</Text>
  }

  return (
    <Flex direction="column" gap="6">
      {metadata.map((metadataItem) =>
        metadataItem.extension === 'cube' ? (
          <CubeMetadataTable metadataItem={metadataItem} key={metadataItem.extension} />
        ) : (
          <MetadataTable metadataItem={metadataItem} key={metadataItem.extension} />
        ),
      )}
    </Flex>
  )
}
