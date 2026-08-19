import { lazy, Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { DataDiscoveryPage } from '../pages/DataDiscoveryPage/DataDiscoveryPage'
import { DataFinderPage } from '../pages/DataFinderPage/DataFinderPage'
import { OrderDetailsPage } from '@/pages/OrderDetailsPage/OrderDetailsPage'
import { Navigate } from 'react-router-dom'
import { PurchasedDataPage } from '@/pages/PurchasedDataPage/PurchasedDataPage'
import { WorkflowOutputsPage } from '@/pages/WorkflowOutputsPage/WorkflowOutputsPage'
import { DataStoragePage } from '@/pages/DataStoragePage/DataStoragePage'
import { MembersPage } from '@/pages/MembersPage/MembersPage'
import { CredentialsPage } from '@/pages/CredentialsPage/CredentialsPage'
import { ProviderAccountsPage } from '@/pages/ProviderAccountsPage/ProviderAccountsPage'
import { CreditsPage } from '@/pages/CreditsPage/CreditsPage'
import { BudgetPage } from '@/pages/BudgetPage/BudgetPage'
import { UsagePage } from '@/pages/UsagePage/UsagePage'
import { SettingsPage } from '@/pages/SettingsPage/SettingsPage'
import { AccountingPage } from '@/pages/AccountingPage/AccountingPage'
import { PublisherPage } from '@/pages/PublisherPage/PublisherPage'
import { PublishingPage } from '@/pages/PublishingPage/PublishingPage'
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute'
import { MyDataPage } from '@/pages/MyDataPage/MyDataPage'
import { ProfilePage } from '@/pages/ProfilePage/ProfilePage'
import { PlatformAdminUsagePage } from '@/pages/PlatformAdminUsagePage/PlatformAdminUsagePage'
import { PlatformAdminPage } from '@/pages/PlatformAdminPage/PlatformAdminPage'
import { PlatformWorkspacesPage } from '@/pages/PlatformWorkspacesPage/PlatformWorkspacesPage'
import { PlatformBudgetPolicyPage } from '@/pages/PlatformBudgetPolicyPage/PlatformBudgetPolicyPage'
import { PlatformCostsPage } from '@/pages/PlatformCostsPage/PlatformCostsPage'

const ProcessesCataloguePage = lazy(() =>
  import('@/pages/ProcessesCataloguePage/ProcessesCataloguePage').then((m) => ({
    default: m.ProcessesCataloguePage,
  })),
)
const ProcessDetailPage = lazy(() =>
  import('@/pages/ProcessDetailPage/ProcessDetailPage').then((m) => ({
    default: m.ProcessDetailPage,
  })),
)

const routes = [
  {
    path: '/',
    element: <DataDiscoveryPage />,
  },
  {
    path: '/finder/*',
    element: <DataFinderPage />,
  },
  {
    path: '/catalogue/processes',
    element: (
      <Suspense fallback={<div>Loading…</div>}>
        <ProcessesCataloguePage />
      </Suspense>
    ),
  },
  {
    path: '/catalogue/processes/:itemId',
    element: (
      <Suspense fallback={<div>Loading…</div>}>
        <ProcessDetailPage />
      </Suspense>
    ),
  },
  {
    path: '/order-details/:orderId',
    element: <OrderDetailsPage />,
  },
  {
    path: '/my-data/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <MyDataPage />,
        children: [
          {
            path: '',
            element: <Navigate to="purchased" replace />,
          },
          {
            path: 'purchased',
            element: <PurchasedDataPage />,
          },
          {
            path: 'workflow-outputs',
            element: <WorkflowOutputsPage />,
          },
          {
            path: 'workflow-outputs/:workspace/:jobId',
            element: <WorkflowOutputsPage />,
          },
          {
            path: 'data-storage',
            element: <DataStoragePage />,
          },
        ],
      },
    ],
  },
  {
    path: '/profile',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <Navigate to="workspaces" replace />,
      },
      {
        path: '',
        element: <PlatformAdminPage />,
        children: [
          {
            path: 'workspaces',
            element: <PlatformWorkspacesPage />,
          },
          {
            path: 'budget-policy',
            element: <PlatformBudgetPolicyPage />,
          },
          {
            path: 'costs',
            element: <PlatformCostsPage />,
          },
          {
            path: 'usage',
            element: <PlatformAdminUsagePage />,
          },
        ],
      },
    ],
  },
  {
    path: '/settings/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <Navigate to="members" replace />,
      },
      {
        path: '',
        element: <SettingsPage />,
        children: [
          {
            path: 'members',
            element: <MembersPage />,
          },
          {
            path: 'credentials',
            element: <CredentialsPage />,
          },
          {
            path: 'provider-accounts',
            element: <ProviderAccountsPage />,
          },
        ],
      },
      {
        path: '',
        element: <AccountingPage />,
        children: [
          {
            path: 'credits',
            element: <CreditsPage />,
          },
          {
            path: 'budget',
            element: <BudgetPage />,
          },
          {
            path: 'usage',
            element: <UsagePage />,
          },
        ],
      },
    ],
  },
  {
    path: '/publisher',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <PublishingPage />,
        children: [
          {
            path: '',
            element: <PublisherPage />,
          },
        ],
      },
    ],
  },
]

const routesWithErrorFallback = routes.map((route) => ({
  ...route,
  errorElement: <div>&nbsp;We&apos;re sorry. Something is broken. </div>,
}))

export const router = createHashRouter(
  [
    {
      element: <AppLayout />,
      children: routesWithErrorFallback,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  },
)
