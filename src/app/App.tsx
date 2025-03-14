import { Theme } from '@radix-ui/themes'
import './App.module.css'
import '@radix-ui/themes/styles.css'
import 'react-toastify/dist/ReactToastify.css'
import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider } from 'react-router-dom'
import { AuthenticationContextProvider } from '@/provider/AuthenticationProvider'
import { router } from './router'

function App() {
  return (
    <ErrorBoundary fallback={<div>We&apos;re sorry. Something is broken.</div>}>
      <AuthenticationContextProvider>
        <Theme accentColor="blue">
          <RouterProvider router={router} />
        </Theme>
      </AuthenticationContextProvider>
    </ErrorBoundary>
  )
}

export default App
