import { PlaceholderPage } from '@/components/PlaceholderPage/PlaceholderPage'
import { MembersPage } from '@/pages/MembersPage/MembersPage'

export const settingsRoutes = [
  { to: 'members', label: 'Members', element: <MembersPage /> },
  { to: 'credentials', label: 'Credentials', element: <PlaceholderPage title="Credentials" /> },
  {
    to: 'provider-accounts',
    label: 'Provider accounts',
    element: <PlaceholderPage title="Provider accounts" />,
  },
]
