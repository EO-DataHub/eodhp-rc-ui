import React, { useMemo, useContext } from 'react'
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
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'

interface ItemInfoPanelProps {
  item: Item | null
  isUserItem?: boolean
  onClose: () => void
}

export const ItemInfoPanel: React.FC<ItemInfoPanelProps> = ({ item, isUserItem, onClose }) => {
  const { currentWorkspace, token } = useContext(AuthenticationContext)
  const collectionUrl = useMemo(() => {
    const url = item?.links.find((link) => link.rel === 'parent')?.href
    return url
  }, [item?.links])

  // Fetch workspace token for user collections
  const { data: workspaceTokensData } = useQuery({
    queryKey: ['WorkspaceTokens', currentWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!token && !!isUserItem,
  })

  // Always fetch the full item when viewing metadata (GET /items/{id} returns full properties)
  // POST search endpoint returns minimal properties for performance, but GET /items/{id} returns full
  const { data, isLoading, error } = useQuery({
    queryKey: ['Items', item?.collection, item?.id, isUserItem],
    queryFn: () =>
      fetchItem({
        collectionUrl: collectionUrl,
        itemId: item?.id,
        workspaceToken: isUserItem ? workspaceTokensData?.access : undefined,
      }),
    refetchOnWindowFocus: false,
    enabled: !!item && !!collectionUrl && (isUserItem ? !!workspaceTokensData : true),
  })

  // Use fetched data if available, otherwise fallback to original item
  const dataResult = data ?? item
  const isLoadingResult = isLoading
  const errorResult = !!error && !data // Only show error if no fallback data available

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
                <IconButton variant="ghost" onClick={onClose} aria-label="Close">
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
