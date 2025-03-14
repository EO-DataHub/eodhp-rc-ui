import { Cross1Icon, Link1Icon, Share1Icon } from '@radix-ui/react-icons'
import { Badge, Box, Flex, IconButton, Tabs, Text, Tooltip } from '@radix-ui/themes'
import React from 'react'
import styles from './InfoPanel.module.scss'
import { TruncatedText } from './TruncatedText'
import { MetadataSection } from './MetadataSection'
import { getFormattedDateRange } from '@/library/dateUtils'
import { Collection } from '@/types'
import { AssetItemTable } from './AssetItemTable'
import { AdditionalResourcesSection } from './AdditionalResourcesSection'
import { ProvidersSection } from './ProvidersSection'

interface CollectionInfoPanelProps {
  onClose: () => void
}

export const CollectionInfoPanel: React.FC<CollectionInfoPanelProps> = ({ onClose }) => {
  const storedCollection = localStorage.getItem('selectedCollection')
  const selectedCollection: Collection = storedCollection ? JSON.parse(storedCollection) : null

  return (
    <>
      {selectedCollection && (
        <>
          <Flex direction="column" gap="1">
            <Flex justify="between" align="center">
              <Text weight="medium" size="5" className={styles.title} title={selectedCollection.id}>
                {selectedCollection.title ?? selectedCollection.id}
              </Text>
              <Flex direction="row" gap="5" align="center">
                <Tooltip content="Source Data">
                  <IconButton variant="ghost">
                    <Link1Icon width="20" height="20" color="#60646C" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Share">
                  <IconButton variant="ghost">
                    <Share1Icon width="20" height="20" color="#60646C" />
                  </IconButton>
                </Tooltip>
                <IconButton variant="ghost" onClick={onClose}>
                  <Cross1Icon width="20" height="20" color="#60646C" />
                </IconButton>
              </Flex>
            </Flex>
            <Text size="3" className={styles.subtitle}>
              {getFormattedDateRange(selectedCollection.extent.temporal.interval[0] ?? [])}
            </Text>
            <TruncatedText text={selectedCollection.description} />
          </Flex>

          <Flex direction="row" wrap="wrap" gap="2">
            {selectedCollection.keywords?.map((keyword) => (
              <Badge color="gray" key={keyword} radius="full">
                {keyword}
              </Badge>
            ))}
          </Flex>

          <Tabs.Root defaultValue="metadata">
            <Tabs.List style={{ justifySelf: 'flex-start', fontSize: 16 }}>
              <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
              <Tabs.Trigger value="assets">Assets</Tabs.Trigger>
              <Tabs.Trigger value="providers">Providers</Tabs.Trigger>
              <Tabs.Trigger value="resources">Additional Resources</Tabs.Trigger>
              <Tabs.Trigger value="data_quality">Data Quality</Tabs.Trigger>
            </Tabs.List>

            <Box pt="6">
              <Tabs.Content value="metadata">
                <MetadataSection
                  stacElement={selectedCollection}
                  isLoading={false}
                  hasError={false}
                  ignoredFields={['assets', 'providers', 'links']}
                />
              </Tabs.Content>

              <Tabs.Content value="assets">
                <Flex direction="column" gap="6">
                  <AssetItemTable assets={selectedCollection.assets} />
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="providers">
                <ProvidersSection providers={selectedCollection.providers} />
              </Tabs.Content>

              <Tabs.Content value="resources">
                <AdditionalResourcesSection links={selectedCollection.links} />
              </Tabs.Content>

              <Tabs.Content value="data_quality">
                <Text>No additional data quality metrics available.</Text>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </>
      )}
    </>
  )
}
