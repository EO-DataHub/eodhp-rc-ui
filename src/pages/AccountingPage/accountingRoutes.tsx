import { CreditsPage } from '@/pages/CreditsPage/CreditsPage'
import { UsagePage } from '@/pages/UsagePage/UsagePage'

export const accountingRoutes = [
  { to: 'credits', label: 'Credits', element: <CreditsPage /> },
  { to: 'usage', label: 'Usage', element: <UsagePage /> },
]
