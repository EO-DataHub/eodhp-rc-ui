import { Collection } from '@/types'
import { Cross1Icon, Link1Icon, Share1Icon } from '@radix-ui/react-icons'
import { Badge, Box, Flex, IconButton, Tabs, Text, Tooltip } from '@radix-ui/themes'
import React from 'react'
import styles from './InfoPanel.module.scss'
import { TruncatedText } from './TruncatedText'
import { MetadataSection } from './MetadataSection'
import { getFormattedDateRange } from '@/library/dateUtils'

interface CollectionInfoPanelProps {
  collection: Collection | null
  onClose: () => void
}

export const CollectionInfoPanel: React.FC<CollectionInfoPanelProps> = ({
  collection,
  onClose,
}) => {
  return (
    <>
      <IconButton variant="ghost" className={styles.closeButton} onClick={onClose}>
        <Cross1Icon width="20" height="20" />
      </IconButton>
      {collection && (
        <>
          <Flex direction="column" gap="1">
            <Flex direction="row" align="center" justify="between" gap="9">
              <Flex direction="column" gap="1" overflow="hidden">
                <Text weight="medium" size="5" className={styles.title} title={collection.id}>
                  {collection.id}
                </Text>
                <Text size="3" className={styles.subtitle}>
                  {getFormattedDateRange(collection.extent.temporal.interval[0] ?? [])}
                </Text>
              </Flex>
              <Flex direction="row" gap="5" align="center">
                <Tooltip content="Source Data">
                  <IconButton variant="ghost">
                    <Link1Icon width="20" height="20" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Share">
                  <IconButton variant="ghost">
                    <Share1Icon width="20" height="20" color="black" fill="black" />
                  </IconButton>
                </Tooltip>
              </Flex>
            </Flex>
            <TruncatedText text={collection.description} />
          </Flex>

          <Flex direction="row" gap="2">
            {collection.keywords?.map((keyword) => (
              <Badge color="gray" key={keyword} radius="full">
                {keyword}
              </Badge>
            ))}
          </Flex>

          <Tabs.Root defaultValue="metadata">
            <Tabs.List style={{ justifySelf: 'flex-start', fontSize: 16 }}>
              <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
              <Tabs.Trigger value="data_quality">Data Quality</Tabs.Trigger>
            </Tabs.List>

            <Box pt="6">
              <Tabs.Content value="metadata">
                <MetadataSection stacElement={collection} isLoading={false} hasError={false} />
              </Tabs.Content>

              <Tabs.Content value="data_quality">
                <Text>TODO</Text>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </>
      )}
    </>
  )
}
