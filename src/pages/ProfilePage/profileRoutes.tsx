import { IdentityPage } from '@/pages/IdentityPage/IdentityPage'
import { AccountsPage } from '@/pages/AccountsPage/AccountsPage'

export const profileRoutes = [
  { to: 'identity', label: 'Identity', element: <IdentityPage /> },
  { to: 'accounts', label: 'Accounts', element: <AccountsPage /> },
]

export const defaultProfileRoute = 'identity'
