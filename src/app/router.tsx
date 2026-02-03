import { lazy, Suspense } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { DataDiscoveryPage } from '../pages/DataDiscoveryPage/DataDiscoveryPage'
import { DataFinderPage } from '../pages/DataFinderPage/DataFinderPage'
import { OrderDetailsPage } from '@/pages/OrderDetailsPage/OrderDetailsPage'
import { MyDataPage } from '@/pages/MyDataPage/MyDataPage'
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute'

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
    element: <Navigate to="/" replace />,
  },
  {
    path: '/finder/:collectionId',
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
