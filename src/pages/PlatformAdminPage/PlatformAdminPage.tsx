import React, { useContext } from 'react'
import { Box, Flex, Text } from '@radix-ui/themes'
import { NavLink, Outlet } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { Callout } from '@/components/Callout/Callout'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import styles from '../SettingsPage/SettingsPage.module.scss'

export const PlatformAdminPage: React.FC = () => {
  const { isHubAdmin } = useContext(AuthenticationContext)

  if (!isHubAdmin) {
    return (
      <Flex direction="column" gap="7" p="6">
        <PageHeading
          title="Platform admin"
          subtitle="Cross-workspace settings, budgets and usage for the whole platform"
          hideWorkspace
        />
        <Callout type="error" message="You don't have permission to view this page." />
      </Flex>
    )
  }

  return (
    <Flex height="100vh" className={styles.container}>
      <Box className={styles.sidebar}>
        <Flex direction="column" gap="1" p="4">
          <Text size="2" weight="bold" color="gray" mb="2">
            Platform admin
          </Text>
          <NavLink
            to="workspaces"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Workspace settings
          </NavLink>
          <NavLink
            to="budget-policy"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Budget policy
          </NavLink>
          <NavLink
            to="costs"
            className={({ isActive }) =>
              `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
            }
          >
            Platform costs
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
