import React from 'react'
import { Flex, Box, Text } from '@radix-ui/themes'
import { NavLink, Outlet } from 'react-router-dom'
import styles from '../SettingsPage/SettingsPage.module.scss'

export const AccountingPage: React.FC = () => {
  return (
    <Flex height="100vh" className={styles.container}>
      <Box className={styles.sidebar}>
        <Flex direction="column" gap="1" p="4">
          <Text size="2" weight="bold" color="gray" mb="2">
            Accounting / Billing
          </Text>
          <NavLink
            to="credits"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Credits
          </NavLink>
          <NavLink
            to="budget"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Budget
          </NavLink>
          <NavLink
            to="usage"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Usage
          </NavLink>
        </Flex>
      </Box>
      <Box className={styles.content}>
        <Outlet />
      </Box>
    </Flex>
  )
}
