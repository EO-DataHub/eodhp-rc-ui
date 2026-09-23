import React from 'react'
import { SidebarNavLayout } from '@/components/SidebarNavLayout/SidebarNavLayout'
import { accountingRoutes } from './accountingRoutes'

export const AccountingPage: React.FC = () => {
  return <SidebarNavLayout title="Accounting" links={accountingRoutes} />
}
