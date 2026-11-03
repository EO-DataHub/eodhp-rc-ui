import React, { useContext } from 'react'
import { SidebarNavLayout } from '@/components/SidebarNavLayout/SidebarNavLayout'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { accountingRoutes, HUB_USAGE_PATH } from './accountingRoutes'

export const AccountingPage: React.FC = () => {
  const { isHubAdmin } = useContext(AuthenticationContext)
  const links = isHubAdmin
    ? [...accountingRoutes, { to: HUB_USAGE_PATH, label: 'All workspaces' }]
    : accountingRoutes
  return <SidebarNavLayout title="Accounting" links={links} />
}
