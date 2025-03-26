import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { DataDiscoveryPage } from '../pages/DataDiscoveryPage/DataDiscoveryPage'
import { DataFinderPage } from '../pages/DataFinderPage/DataFinderPage'
import { OrderDetailsPage } from '@/pages/OrderDetailsPage/OrderDetailsPage'

// eslint-disable-next-line react-refresh/only-export-components
function RouteErrorFallback() {
  const error = useRouteError()

  return (
    <div
      role="alert"
      style={{
        padding: '2rem',
        fontFamily: 'monospace',
        color: 'red',
        whiteSpace: 'pre-wrap',
      }}
    >
      <p>&nbsp;We&apos;re sorry. Something is broken...</p>
      <p>
        <strong>Error:</strong>
      </p>

      <pre>
        {error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : error instanceof Response
              ? `Response: ${error.status} ${error.statusText}`
              : JSON.stringify(error, null, 2)}
      </pre>

      {error instanceof Error && error.stack && (
        <details style={{ marginTop: '1rem' }}>
          <summary>Stack trace</summary>
          <pre>{error.stack}</pre>
        </details>
      )}
    </div>
  )
}

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
]

const routesWithErrorFallback = routes.map((route) => ({
  ...route,
  errorElement: <RouteErrorFallback />,
}))

export const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      errorElement: <RouteErrorFallback />,
      children: routesWithErrorFallback,
    },
  ],
  { basename: import.meta.env.VITE_BASE_PATH },
)
