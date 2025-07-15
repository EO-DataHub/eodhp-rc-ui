import { createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { DataDiscoveryPage } from '../pages/DataDiscoveryPage/DataDiscoveryPage'
import { DataFinderPage } from '../pages/DataFinderPage/DataFinderPage'
import { OrderDetailsPage } from '@/pages/OrderDetailsPage/OrderDetailsPage'
import { MyDataPage } from '@/pages/MyDataPage/MyDataPage'
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute'
import { ProcessCataloguePage } from '../pages/ProcessCataloguePage/ProcessCataloguePage'
import { WorkflowOutputsItemsPage } from '@/pages/WorkflowOutputsItemsPage/WorkflowOutputsItemsPage'

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
  {
    path: '/process-catalogue',
    element: <ProcessCataloguePage />,
  },
  {
    path: '/workflow-outputs/items/:encodedItemsEndpoint',
    element: <WorkflowOutputsItemsPage />,
  },
]

const routesWithErrorFallback = routes.map((route) => ({
  ...route,
  errorElement: <div>&nbsp;We&apos;re sorry. Something is broken. </div>,
}))

export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: routesWithErrorFallback,
  },
])
