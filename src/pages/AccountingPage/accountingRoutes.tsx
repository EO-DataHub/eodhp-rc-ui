import { lazy, Suspense } from 'react'

const CreditsPage = lazy(() =>
  import('@/pages/CreditsPage/CreditsPage').then((m) => ({ default: m.CreditsPage })),
)
const UsagePage = lazy(() =>
  import('@/pages/UsagePage/UsagePage').then((m) => ({ default: m.UsagePage })),
)
const HubUsagePage = lazy(() =>
  import('@/pages/HubUsagePage/HubUsagePage').then((m) => ({ default: m.HubUsagePage })),
)

export const accountingRoutes = [
  {
    to: 'credits',
    label: 'Credits',
    element: (
      <Suspense fallback={<div>Loading…</div>}>
        <CreditsPage />
      </Suspense>
    ),
  },
  {
    to: 'usage',
    label: 'Usage',
    element: (
      <Suspense fallback={<div>Loading…</div>}>
        <UsagePage />
      </Suspense>
    ),
  },
  {
    to: 'hub',
    label: 'All workspaces',
    // Hidden from the sidebar for everyone else. The page checks the role itself too, since
    // the route can still be reached by URL.
    hubAdminOnly: true,
    element: (
      <Suspense fallback={<div>Loading…</div>}>
        <HubUsagePage />
      </Suspense>
    ),
  },
]
