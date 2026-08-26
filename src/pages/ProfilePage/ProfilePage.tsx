import React from 'react'
import { SidebarNavLayout } from '../../components/SidebarNavLayout/SidebarNavLayout'
import { profileRoutes } from './profileRoutes'

export const ProfilePage: React.FC = () => {
  return <SidebarNavLayout title="Profile" links={profileRoutes} />
}
