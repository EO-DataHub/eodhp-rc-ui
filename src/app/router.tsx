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
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute'
import { MyDataPage } from '@/pages/MyDataPage/MyDataPage'
import { SettingsPage } from '@/pages/SettingsPage/SettingsPage'
import { PlaceholderPage } from '@/components/PlaceholderPage/PlaceholderPage'

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
        element: <PlaceholderPage title="Profile" />,
      },
    ],
  },
  {
    path: '/settings',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <SettingsPage />,
        children: [
          {
            path: '',
            element: <Navigate to="members" replace />,
          },
          {
            path: 'members',
            element: <PlaceholderPage title="Members" />,
          },
          {
            path: 'credentials',
            element: <PlaceholderPage title="Credentials" />,
          },
          {
            path: 'provider-accounts',
            element: <PlaceholderPage title="Provider accounts" />,
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
