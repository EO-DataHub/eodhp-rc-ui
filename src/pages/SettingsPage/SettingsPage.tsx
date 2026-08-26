import React from 'react'
import { SidebarNavLayout } from '../../components/SidebarNavLayout/SidebarNavLayout'

const links = [
  { to: 'members', label: 'Members' },
  { to: 'credentials', label: 'Credentials' },
  { to: 'provider-accounts', label: 'Provider accounts' },
]

export const SettingsPage: React.FC = () => {
  return <SidebarNavLayout title="Settings" links={links} />
}
