import React from 'react'
import { SidebarNavLayout } from '../../components/SidebarNavLayout/SidebarNavLayout'

const links = [
  { to: 'purchased', label: 'Purchased data' },
  { to: 'workflow-outputs', label: 'Workflow outputs' },
  { to: 'data-storage', label: 'Files' },
]

export const MyDataPage: React.FC = () => {
  return <SidebarNavLayout title="My data" links={links} />
}
