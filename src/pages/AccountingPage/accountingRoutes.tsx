import { lazy, Suspense } from 'react'

const CreditsPage = lazy(() =>
  import('@/pages/CreditsPage/CreditsPage').then((m) => ({ default: m.CreditsPage })),
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
