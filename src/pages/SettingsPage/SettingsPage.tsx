import React from 'react'
import { Flex, Box, Text } from '@radix-ui/themes'
import { NavLink, Outlet } from 'react-router-dom'
import styles from './SettingsPage.module.scss'

export const SettingsPage: React.FC = () => {
  return (
    <Flex height="100vh" className={styles.container}>
      <Box className={styles.sidebar}>
        <Flex direction="column" gap="1" p="4">
          <Text size="2" weight="bold" color="gray" mb="2">
            Settings
          </Text>
          <NavLink
            to="members"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Members
          </NavLink>
          <NavLink
            to="credentials"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Credentials
          </NavLink>
          <NavLink
            to="provider-accounts"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Provider accounts
          </NavLink>
        </Flex>
      </Box>
      <Box className={styles.content}>
        <Outlet />
      </Box>
    </Flex>
  )
}
