import React, { useContext } from 'react'
import { SidebarNavLayout } from '@/components/SidebarNavLayout/SidebarNavLayout'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { accountingRoutes } from './accountingRoutes'

export const AccountingPage: React.FC = () => {
  const { isHubAdmin } = useContext(AuthenticationContext)
  const links = accountingRoutes.filter((route) => isHubAdmin || !('hubAdminOnly' in route))
  return <SidebarNavLayout title="Accounting" links={links} />
}
