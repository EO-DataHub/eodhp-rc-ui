import { Theme } from '@radix-ui/themes'
import './App.module.css'
import '@radix-ui/themes/styles.css'
import 'react-toastify/dist/ReactToastify.css'
import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider } from 'react-router-dom'
import { AuthenticationContextProvider } from '@/provider/AuthenticationProvider'
import { router } from './router'

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div>
      <p>We&apos;re sorry. Something is broken..</p>
      <p>Error: {error.message}</p>
      <details style={{ marginTop: '1rem' }}>
        <summary>Stack trace</summary>
        <pre>{error.stack}</pre>
      </details>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthenticationContextProvider>
        <Theme accentColor="blue">
          <RouterProvider router={router} />
        </Theme>
      </AuthenticationContextProvider>
    </ErrorBoundary>
  )
}

export default App
