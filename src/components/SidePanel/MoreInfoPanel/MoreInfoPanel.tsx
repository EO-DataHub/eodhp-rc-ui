import React from 'react'
import { Cross1Icon, Share1Icon, Link1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton, Tabs, Box } from '@radix-ui/themes'
import styles from './MoreInfoPanel.module.scss'
import type { Item } from '@/types'
import { convertDateToUTCString } from '@/library/convertDateToUTCString'

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
              <IconButton radius="full" variant="ghost">
                <Link1Icon width="20" height="20" />
              </IconButton>
              <IconButton radius="full" variant="ghost">
                <Share1Icon width="20" height="20" color="black" fill="black" />
              </IconButton>
            </Flex>
          </Flex>

          <Tabs.Root defaultValue="account">
            <Tabs.List>
              <Tabs.Trigger value="account">Metadata</Tabs.Trigger>
              <Tabs.Trigger value="documents">Assets</Tabs.Trigger>
              <Tabs.Trigger value="settings">Additional Resources</Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              <Tabs.Content value="account">
                <Text size="2">Make changes to your account.</Text>
              </Tabs.Content>

              <Tabs.Content value="documents">
                <Text size="2">Access and update your documents.</Text>
              </Tabs.Content>

              <Tabs.Content value="settings">
                <Text size="2">Edit your profile or update contact information.</Text>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </>
      )}
    </Flex>
  )
}
