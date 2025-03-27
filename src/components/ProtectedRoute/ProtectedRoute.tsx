import { useContext, useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isAuthenticating } = useContext(AuthenticationContext)
  const [hasStartedAuth, setHasStartedAuth] = useState(false)

  useEffect(() => {
    if (isAuthenticating) {
      //Mark that authentication has started at least once
      setHasStartedAuth(true)
    }
  }, [isAuthenticating])

  if (isAuthenticating || !hasStartedAuth) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
