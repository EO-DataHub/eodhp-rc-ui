import { MembersPage } from '@/pages/MembersPage/MembersPage'
import { ProviderAccountsPage } from '@/pages/ProviderAccountsPage/ProviderAccountsPage'
import { CredentialsPage } from '@/pages/CredentialsPage/CredentialsPage'
import { S3CredentialsPage } from '@/pages/S3CredentialsPage/S3CredentialsPage'

export const settingsRoutes = [
  { to: 'members', label: 'Members', element: <MembersPage /> },
  { to: 'credentials', label: 'Credentials', element: <CredentialsPage /> },
  { to: 's3-credentials', label: 'S3 credentials', element: <S3CredentialsPage /> },
  {
    to: 'provider-accounts',
    label: 'Provider accounts',
    element: <ProviderAccountsPage />,
  },
]
