import React, { useMemo } from 'react'
import { Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton, Tabs, Box } from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Item } from '@/types'
import { convertDateToUTCString } from '@/library/dateUtils'
import { MetadataSection } from './MetadataSection'
import { useQuery } from '@tanstack/react-query'
import { fetchItem } from '@/services/itemService'
import { AdditionalResourcesSection } from './AdditionalResourcesSection'
import { AssetSection } from './AssetSection'

interface ItemInfoPanelProps {
  item: Item | null
  isUserItem?: boolean
  onClose: () => void
}

export const ItemInfoPanel: React.FC<ItemInfoPanelProps> = ({ item, isUserItem, onClose }) => {
  const collectionUrl = useMemo(() => {
    const url = item?.links.find((link) => link.rel === 'parent')?.href
    return url
  }, [item?.links])

  const { data, isLoading, error } = useQuery({
    queryKey: ['Items', item?.collection, item?.id],
    queryFn: () => fetchItem({ collectionUrl: collectionUrl, itemId: item?.id }),
    refetchOnWindowFocus: false,
    enabled: !!item && !isUserItem,
  })

  const dataResult = isUserItem ? item : data
  const isLoadingResult = isUserItem ? false : isLoading
  const errorResult = isUserItem ? false : !!error

  const itemWithCollectionContext = useMemo(() => {
    if (!dataResult) return dataResult
    // Keep existing collectionRef if present
    if (dataResult.collectionRef) {
      return dataResult
    }
    // Inherit collectionRef from the original item if available
    if (item?.collectionRef) {
      return {
        ...dataResult,
        collectionRef: item.collectionRef,
      }
    }
    return dataResult
  }, [dataResult, item])

  return (
    <>
      {item && (
        <>
          <Flex direction="column" gap="1">
            <Flex justify="between" align="center">
              <Text weight="medium" size="5" className={styles.title} title={item.id}>
                {item.id}
              </Text>
              <Flex direction="row" gap="5" justify="start">
                <IconButton variant="ghost" onClick={onClose}>
                  <Cross1Icon width="20" height="20" color="#60646C" />
                </IconButton>
              </Flex>
            </Flex>
            <Text size="3" className={styles.subtitle}>
              {item.properties.datetime
                ? convertDateToUTCString(new Date(item.properties.datetime))
                : 'N/A'}
            </Text>
          </Flex>

          <Tabs.Root defaultValue="metadata">
            <Tabs.List style={{ justifySelf: 'flex-start', fontSize: 16 }}>
              <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
              <Tabs.Trigger value="assets">Assets</Tabs.Trigger>
              <Tabs.Trigger value="resources">Additional Resources</Tabs.Trigger>
            </Tabs.List>

            <Box pt="6">
              <Tabs.Content value="metadata">
                <MetadataSection
                  stacElement={itemWithCollectionContext}
                  isLoading={isLoadingResult}
                  hasError={!!errorResult}
                  ignoredFields={['providers']}
                />
              </Tabs.Content>

              <Tabs.Content value="assets">
                <AssetSection
                  item={itemWithCollectionContext}
                  isLoading={isLoadingResult}
                  hasError={!!errorResult}
                />
              </Tabs.Content>

              <Tabs.Content value="resources">
                <AdditionalResourcesSection
                  links={itemWithCollectionContext?.links}
                  isLoading={isLoadingResult}
                  hasError={!!errorResult}
                />
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </>
      )}
    </>
  )
}
