import { Theme } from '@radix-ui/themes'
import './App.module.css'
import '@radix-ui/themes/styles.css'
import 'react-toastify/dist/ReactToastify.css'
import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider } from 'react-router-dom'
import { AuthenticationContextProvider } from '@/provider/AuthenticationProvider'
import { router } from './router'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useEffect } from 'react'
import { RestoreAOIContextProvider } from '@/provider/RestoreAOIProvider'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'
import { AuthenticatedTileUrlsProvider } from '@/components/AuthenticatedTileUrlsProvider'
import { ConsentBanner } from '@/components/ConsentBanner/ConsentBanner'
import { ConsentButton } from '@/components/ConsentButton/ConsentButton'

function App() {
  useGoogleAnalytics(router)
  useEffect(() => {
    dataFinderStore.send({
      type: 'hydrateFromLocalStorage',
    })
  }, [])

  return (
    <ErrorBoundary fallback={<div>We&apos;re sorry. Something is broken.</div>}>
      <AuthenticationContextProvider>
        <AuthenticatedTileUrlsProvider>
          <RestoreAOIContextProvider>
            <Theme accentColor="blue">
              <RouterProvider router={router} />
              <ConsentBanner />
              <ConsentButton />
            </Theme>
          </RestoreAOIContextProvider>
        </AuthenticatedTileUrlsProvider>
      </AuthenticationContextProvider>
    </ErrorBoundary>
  )
}

export default App
