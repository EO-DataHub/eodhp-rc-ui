import React from 'react'
import { Flex, Box, Text, Badge } from '@radix-ui/themes'
import { NavLink, Outlet } from 'react-router-dom'
import styles from '../SettingsPage/SettingsPage.module.scss'

export const PublishingPage: React.FC = () => {
  return (
    <Flex height="100vh" className={styles.container}>
      <Box className={styles.sidebar}>
        <Flex direction="column" gap="1" p="4">
          <Text size="2" weight="bold" color="gray" mb="2">
            Publishing
          </Text>
          <Flex align="center" gap="2" className={styles.sidebarLink} style={{ cursor: 'default' }}>
            Metadata Loader
            <Badge color="gray" variant="soft">
              Soon
            </Badge>
          </Flex>
          <NavLink
            to="."
            end
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Publisher
          </NavLink>
        </Flex>
      </Box>
      <Box className={styles.content}>
        <Outlet />
      </Box>
    </Flex>
  )
}
