import React from 'react'
import { Flex, Box } from '@radix-ui/themes'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import styles from './MyDataPage.module.scss'

const getActiveTabFromPathname = (
  pathname: string,
): 'purchased' | 'workflow-outputs' | 'data-storage' => {
  if (pathname.includes('/my-data/workflow-outputs')) {
    return 'workflow-outputs'
  }
  if (pathname.includes('/my-data/data-storage')) {
    return 'data-storage'
  }
  return 'purchased'
}

export const MyDataPage: React.FC = () => {
  const location = useLocation()
  const activeTab = getActiveTabFromPathname(location.pathname)

  return (
    <Flex direction="column" gap="4" height="100vh" className={styles.mainContainer}>
      <Box className={styles.tabsHeader}>
        <Flex gap="4" role="tablist" aria-label="My data sections" className={styles.tabsList}>
          <NavLink
            to="purchased"
            className={({ isActive }) =>
              `${styles.tabLink} ${activeTab === 'purchased' || isActive ? styles.tabLinkActive : ''}`
            }
            role="tab"
            aria-selected={activeTab === 'purchased'}
          >
            Purchased data
          </NavLink>
          <NavLink
            to="workflow-outputs"
            className={({ isActive }) =>
              `${styles.tabLink} ${
                activeTab === 'workflow-outputs' || isActive ? styles.tabLinkActive : ''
              }`
            }
            role="tab"
            aria-selected={activeTab === 'workflow-outputs'}
          >
            Workflow outputs
          </NavLink>
          {/* Uncomment to enable data storage tab<NavLink
            to="data-storage"
            className={({ isActive }) =>
              `${styles.tabLink} ${
                activeTab === 'data-storage' || isActive ? styles.tabLinkActive : ''
              }`
            }
            role="tab"
            aria-selected={activeTab === 'data-storage'}
          >
            Data storage
          </NavLink> */}
        </Flex>
      </Box>

      <Box mt="4">
        <Outlet />
      </Box>
    </Flex>
  )
}
