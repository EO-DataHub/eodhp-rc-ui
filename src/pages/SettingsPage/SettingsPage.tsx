import React from 'react'
import { SidebarNavLayout } from '../../components/SidebarNavLayout/SidebarNavLayout'
import { settingsRoutes } from './settingsRoutes'

export const SettingsPage: React.FC = () => {
  return <SidebarNavLayout title="Settings" links={settingsRoutes} />
}
