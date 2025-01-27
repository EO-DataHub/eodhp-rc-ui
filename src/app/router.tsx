import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { DataDiscoveryPage } from '../pages/DataDiscoveryPage/DataDiscoveryPage'
import { DataFinderPage } from '../pages/DataFinderPage/DataFinderPage'

const routes = [
  {
    path: '/',
    element: <DataDiscoveryPage />,
  },
  {
    path: '/finder',
    element: <DataFinderPage />,
  },
]

const routesWithErrorFallback = routes.map((route) => ({
  ...route,
  errorElement: <div>&nbsp;We&apos;re sorry. Something is broken. </div>,
}))

export const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      errorElement: <div>&nbsp;We&apos;re sorry. Something is broken. </div>,
      children: routesWithErrorFallback,
    },
  ],
  { basename: import.meta.env.VITE_BASE_PATH },
)
