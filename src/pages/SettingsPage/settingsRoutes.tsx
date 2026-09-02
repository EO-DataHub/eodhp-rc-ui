import { PlaceholderPage } from '@/components/PlaceholderPage/PlaceholderPage'

export const settingsRoutes = [
  { to: 'members', label: 'Members', element: <PlaceholderPage title="Members" /> },
  { to: 'credentials', label: 'Credentials', element: <PlaceholderPage title="Credentials" /> },
  {
    to: 'provider-accounts',
    label: 'Provider accounts',
    element: <PlaceholderPage title="Provider accounts" />,
  },
]
