import {
  Theme as RadixTheme,
  ThemeProps as RadixThemeProps,
} from '@radix-ui/themes'
import './App.module.css'
import '@radix-ui/themes/styles.css'
import 'react-toastify/dist/ReactToastify.css'
import { ErrorBoundary } from 'react-error-boundary'

import { RouterProvider } from 'react-router-dom'
import { UserAssetsProvider } from '../../context/UserAssetsContext'
import { router } from './router'
import { LoadingContextProvider } from '../../context/LoadingContext'
import { AuthenticationContextProvider } from '../../context/AuthenticationContext'
import { HazardContextProvider } from '../../context/HazardsPageContext'
import { ObservationsContextProvider } from '../../context/ObservationsPageContext'
import { AssetsPageContextProvider } from '../../context/AssetsPageContext'
import { PortfoliosContextProvider } from '../../context/PortfoliosContext'

const RADIX_THEME_PROPS: RadixThemeProps = {
  accentColor: 'indigo',
}

function App() {
  return (
    <ErrorBoundary fallback={<div>We&apos;re sorry. Something is broken.</div>}>
      <AuthenticationContextProvider>
        <LoadingContextProvider>
          <RadixTheme {...RADIX_THEME_PROPS}>
            <UserAssetsProvider>
              <HazardContextProvider>
                <ObservationsContextProvider>
                  <AssetsPageContextProvider>
                    <PortfoliosContextProvider>
                      <RouterProvider router={router} />
                    </PortfoliosContextProvider>
                  </AssetsPageContextProvider>
                </ObservationsContextProvider>
              </HazardContextProvider>
            </UserAssetsProvider>
          </RadixTheme>
        </LoadingContextProvider>
      </AuthenticationContextProvider>
    </ErrorBoundary>
  )
}

export default App
