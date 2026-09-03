import React from 'react'
import { Flex, Box, Text } from '@radix-ui/themes'
import { NavLink, Outlet } from 'react-router-dom'
import styles from './SidebarNavLayout.module.scss'

interface SidebarNavLink {
  to: string
  label: string
}

interface SidebarNavLayoutProps {
  title: string
  links: SidebarNavLink[]
}

export const SidebarNavLayout: React.FC<SidebarNavLayoutProps> = ({ title, links }) => {
  return (
    <Flex height="100vh" className={styles.container}>
      <Box className={styles.sidebar} asChild>
        <nav aria-label={title}>
          <Flex direction="column" gap="1" p="4">
            <Text size="2" weight="bold" color="gray" mb="2">
              {title}
            </Text>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </Flex>
        </nav>
      </Box>
      <Box className={styles.content}>
        <Outlet />
      </Box>
    </Flex>
  )
}
