import React, { useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import type { Item, MetadataItem } from '@/types'
import StacFields from '@radiantearth/stac-fields'
import { MetadataTable } from './MetadataTable'
import { CubeMetadataTable } from './CubeMetadataTable'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'

interface MetadataSectionProps {
  item: Item | null | undefined
  isLoading: boolean
  hasError: boolean
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({ item, isLoading, hasError }) => {
  const metadata: MetadataItem[] = useMemo(() => {
    if (!item) {
      return []
    }
    return StacFields.formatItemProperties(item) as MetadataItem[]
  }, [item])

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
