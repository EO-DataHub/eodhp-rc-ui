import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../Layout/AppLayout'
import { NotFound } from '../pages/404'
import { Assets } from '../pages/Assets/Assets'
import { Hazards } from '../pages/Hazards/Hazards'
import { AssetsAnalytics } from '../pages/AssetsAnalytics/AssetsAnalytics'
import { Observations } from '../pages/Observations/Observations'
import { About } from '../pages/About/About'

import { Portfolios } from '../pages/Portfolios/Portfolios'
import { Settings } from '../pages/Settings'

const routes = [
  {
    path: '/',
    element: <About />,
  },
  {
    path: '/assets',
    element: <Assets />,
  },
  {
    path: '/hazards',
    element: <Hazards />,
  },
  {
    path: '/analytics',
    element: <AssetsAnalytics />,
  },
  {
    path: '/observations',
    element: <Observations />,
  },
  { path: '/portfolios', element: <Portfolios /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <NotFound /> },
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
