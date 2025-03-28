import { Cross1Icon, Share1Icon, Link1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton, Tabs, Box, Tooltip } from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Item } from '@/types'
import { convertDateToUTCString } from '@/library/dateUtils'
import { MetadataSection } from './MetadataSection'
import { AdditionalResourcesSection } from './AdditionalResourcesSection'
import { AssetSection } from './AssetSection'

interface ItemInfoPanelProps {
  item: Item
  isUserItem?: boolean
  onClose: () => void
}

export const ItemInfoPanel: React.FC<ItemInfoPanelProps> = ({ item, isUserItem, onClose }) => {

  const isLoadingResult = isUserItem ? false : false
  const errorResult = isUserItem ? false : false

  const getStatusMessage = () => {
    if (!item) return 'No item data available.'
    return null
  }

  const statusMessage = getStatusMessage()

  if (statusMessage) {
    return <Flex className={styles.status}>{statusMessage}</Flex>
  }

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
              {convertDateToUTCString(new Date(item.properties.datetime))}
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
                  stacElement={item}
                  isLoading={isLoadingResult}
                  hasError={!!errorResult}
                />
              </Tabs.Content>

              <Tabs.Content value="assets">
                <AssetSection
                  item={item}
                />
              </Tabs.Content>

              <Tabs.Content value="resources">
                <AdditionalResourcesSection
                  links={item?.links}
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
