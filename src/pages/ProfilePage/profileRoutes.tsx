import { IdentityPage } from '@/pages/IdentityPage/IdentityPage'
import { AccountsPage } from '@/pages/AccountsPage/AccountsPage'
import { WorkspacesPage } from '@/pages/WorkspacesPage/WorkspacesPage'

export const profileRoutes = [
  { to: 'identity', label: 'Identity', element: <IdentityPage /> },
  { to: 'accounts', label: 'Accounts', element: <AccountsPage /> },
  { to: 'workspaces', label: 'Workspaces', element: <WorkspacesPage /> },
]

export const defaultProfileRoute = 'identity'
