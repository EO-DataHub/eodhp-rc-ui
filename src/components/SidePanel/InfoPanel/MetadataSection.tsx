import React, { useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import type { Item, Collection, MetadataItem } from '@/types'
import StacFields from '@radiantearth/stac-fields'
import { MetadataTable } from './MetadataTable'
import { CubeMetadataTable } from './CubeMetadataTable'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'

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
    if (!stacElement) {
      return []
    }

    const metadataFieldsFilterFunc = (key: string) => !ignoredFields.includes(key)

    if (stacElement.type === 'Collection') {
      return StacFields.formatCollection(stacElement, metadataFieldsFilterFunc) as MetadataItem[]
    }

    return StacFields.formatItemProperties(stacElement, metadataFieldsFilterFunc) as MetadataItem[]
  }, [ignoredFields, stacElement])

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
