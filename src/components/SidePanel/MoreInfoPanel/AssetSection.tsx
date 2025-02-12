import React, { useMemo } from 'react'

import type { Item, MetadataItem } from '@/types'
import { Flex, Heading, Text } from '@radix-ui/themes'
import StacFields from '@radiantearth/stac-fields'
import { AssetItemTable } from './AssetItemTable'

interface AssetSectionProps {
  item: Item | null | undefined
  isLoading: boolean
  hasError: boolean
}

export const AssetSection: React.FC<AssetSectionProps> = ({ item, isLoading, hasError }) => {
  if (isLoading) {
    return <Text>Loading Items...</Text>
  }

  if (hasError) {
    return <Text color="red">Error loading items!</Text>
  }

  return (
    <Flex direction="column" gap="5">
      <AssetItemTable assets={item?.assets} />
    </Flex>
  )
}
