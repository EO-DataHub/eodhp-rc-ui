import { PlaceholderPage } from '@/components/PlaceholderPage/PlaceholderPage'
import { MembersPage } from '@/pages/MembersPage/MembersPage'
import { ProviderAccountsPage } from '@/pages/ProviderAccountsPage/ProviderAccountsPage'

export const settingsRoutes = [
  { to: 'members', label: 'Members', element: <MembersPage /> },
  { to: 'credentials', label: 'Credentials', element: <PlaceholderPage title="Credentials" /> },
  {
    to: 'provider-accounts',
    label: 'Provider accounts',
    element: <ProviderAccountsPage />,
  },
]
