import React from 'react'
import { Cross1Icon, Share1Icon, Link1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton, Tabs, Box, Tooltip } from '@radix-ui/themes'
import styles from './MoreInfoPanel.module.scss'
import type { Item } from '@/types'
import { convertDateToUTCString } from '@/library/convertDateToUTCString'
import { MetadataSection } from './MetadataSection'

interface MoreInfoPanelProps {
  item: Item | null
  onClose: () => void
}

export const MoreInfoPanel: React.FC<MoreInfoPanelProps> = ({ item, onClose }) => {
  const isOpen = item !== null

  return (
    <Flex
      direction="column"
      gap="5"
      p="5"
      pr="8"
      position="absolute"
      className={`${styles.moreInfoPanel} ${isOpen ? styles['moreInfoPanel--open'] : ''}`}
    >
      <IconButton radius="full" variant="ghost" className={styles.closeButton} onClick={onClose}>
        <Cross1Icon width="20" height="20" />
      </IconButton>
      {item && (
        <>
          <Flex direction="row" align="center" justify="between" gap="8">
            <Flex direction="column" gap="1" overflow="hidden">
              <Text weight="medium" size="5" className={styles.title} title={item.id}>
                {item.id}
              </Text>
              <Text size="3" className={styles.subtitle}>
                {convertDateToUTCString(new Date(item.properties.datetime))}
              </Text>
            </Flex>
            <Flex direction="row" gap="5" align="center">
              <Tooltip content="Source Data">
                <IconButton radius="full" variant="ghost">
                  <Link1Icon width="20" height="20" />
                </IconButton>
              </Tooltip>
              <Tooltip content="Share">
                <IconButton radius="full" variant="ghost">
                  <Share1Icon width="20" height="20" color="black" fill="black" />
                </IconButton>
              </Tooltip>
            </Flex>
          </Flex>

          <Tabs.Root defaultValue="metadata">
            <Tabs.List style={{ justifySelf: 'flex-start' }}>
              <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
              <Tabs.Trigger value="assets">Assets</Tabs.Trigger>
              <Tabs.Trigger value="resources">Additional Resources</Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              <Tabs.Content value="metadata">
                <MetadataSection item={item} />
              </Tabs.Content>

              <Tabs.Content value="assets">
                <Text size="2">Asset TODO</Text>
              </Tabs.Content>

              <Tabs.Content value="resources">
                <Text size="2">Resource TODO</Text>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </>
      )}
    </Flex>
  )
}
