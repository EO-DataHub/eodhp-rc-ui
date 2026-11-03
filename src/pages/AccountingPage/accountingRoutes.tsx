import { lazy, Suspense } from 'react'
import { HubAdminRoute } from '@/pages/HubUsagePage/HubAdminRoute'

const CreditsPage = lazy(() =>
  import('@/pages/CreditsPage/CreditsPage').then((m) => ({ default: m.CreditsPage })),
)
const HubUsagePage = lazy(() =>
  import('@/pages/HubUsagePage/HubUsagePage').then((m) => ({ default: m.HubUsagePage })),
)
const HubWorkspaceUsagePage = lazy(() =>
  import('@/pages/HubUsagePage/HubWorkspaceUsagePage').then((m) => ({
    default: m.HubWorkspaceUsagePage,
  })),
)
const UsagePage = lazy(() =>
  import('@/pages/UsagePage/UsagePage').then((m) => ({ default: m.UsagePage })),
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
]

export const HUB_USAGE_PATH = 'hub'

// Hub-admin pages across all workspaces. The sidebar links only to the ranking; the
// drill-down is reached from its rows.
export const hubUsageRoutes = [
  {
    to: HUB_USAGE_PATH,
    label: 'All workspaces',
    element: (
      <HubAdminRoute>
        <Suspense fallback={<div>Loading…</div>}>
          <HubUsagePage />
        </Suspense>
      </HubAdminRoute>
    ),
  },
  {
    to: `${HUB_USAGE_PATH}/:workspace`,
    element: (
      <HubAdminRoute>
        <Suspense fallback={<div>Loading…</div>}>
          <HubWorkspaceUsagePage />
        </Suspense>
      </HubAdminRoute>
    ),
  },
]
