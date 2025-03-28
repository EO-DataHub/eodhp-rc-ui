import { useContext, useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isAuthenticating } = useContext(AuthenticationContext)
  const [hasStartedAuth, setHasStartedAuth] = useState(false)

  useEffect(() => {
    if (isAuthenticating || isAuthenticated) {
      //Mark that authentication has started at least once
      setHasStartedAuth(true)
    }
  }, [isAuthenticating, isAuthenticated])

  if (!hasStartedAuth) {
    return <LoadingIndicator size="3" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
