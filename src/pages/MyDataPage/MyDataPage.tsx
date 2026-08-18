import React from 'react'
import { Flex, Box, Text } from '@radix-ui/themes'
import { NavLink, Outlet } from 'react-router-dom'
import styles from '../SettingsPage/SettingsPage.module.scss'

export const MyDataPage: React.FC = () => {
  return (
    <Flex height="100vh" className={styles.container}>
      <Box className={styles.sidebar}>
        <Flex direction="column" gap="1" p="4">
          <Text size="2" weight="bold" color="gray" mb="2">
            My data
          </Text>
          <NavLink
            to="purchased"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Purchased data
          </NavLink>
          <NavLink
            to="workflow-outputs"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Workflow outputs
          </NavLink>
          <NavLink
            to="data-storage"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Files
          </NavLink>
        </Flex>
      </Box>
      <Box className={styles.content}>
        <Outlet />
      </Box>
    </Flex>
  )
}
