import { useEffect, useState } from 'react'
import { ReactNode } from 'react'
import Keycloak, { KeycloakOnLoad } from 'keycloak-js'
import { AuthenticationContext, KeycloakUserInfo } from '@/context/AuthenticationContext'
import { getAuthenticatedAxios } from '../library/axios'
import { AxiosInstance } from 'axios'
import { toast } from 'react-toastify'
import { fetchWorkspaces } from '@/services/workspaceTokenService'
import { router } from '@/app/router'
import { pathnameToRoute, withoutKeycloakCallbackParams } from '@/app/routerBase'

const BASE_PATH = import.meta.env.VITE_BASE_PATH || ''

/**
 * After a login redirect, keycloak-js removes its ?state=&code= query from the address bar
 * with history.replaceState. React Router does not see that change, so its location keeps
 * the used login query, and pages that update the URL from it (setSearchParams) write the
 * query back. Remove the params from the router's location, which also updates the address
 * bar. Removing them, rather than copying the address bar into the router, also cleans up
 * after a page that wrote them back before this ran.
 */
const removeKeycloakParamsFromRouter = () => {
  const { pathname, search, hash, state } = router.state.location
  const cleaned = withoutKeycloakCallbackParams(search)
  if (cleaned === null) return
  void router.navigate(
    { pathname: pathnameToRoute(pathname), search: cleaned, hash },
    { replace: true, state },
  )
}

const initOptions = {
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: import.meta.env.VITE_KEYCLOAK_REALM as string,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
  onLoad: 'check-sso',
  scope: 'workspaces',
}

const authenticationInstance = new Keycloak(initOptions)

export const AuthenticationContextProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  // Start true so consumers' effects (which run before this provider's init effect, since
  // child effects fire first) don't see a "finished, signed out" state on the first render.
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(
    () => !authenticationInstance.didInitialize,
  )
  const [isAuthenticationServiceError, setIsAuthenticationServiceError] = useState<boolean>(false)
  const [authenticatedAxios, setAuthenticatedAxios] = useState<AxiosInstance | undefined>()
  const [userInfo, setUserInfo] = useState<KeycloakUserInfo>({})
  const [token, setToken] = useState<string>() // we track this to trigger axios reinitialization
  const workspaceUserName = userInfo?.preferred_username
  const [currentWorkspace, setCurrentWorkspace] = useState<string | undefined>(
    () => localStorage.getItem('selectedWorkspace') ?? undefined,
  )

  const updateCurrentWorkspace = (workspace: string) => {
    localStorage.setItem('selectedWorkspace', workspace)
    setCurrentWorkspace(workspace)
  }

  const clearCurrentWorkspace = () => {
    localStorage.removeItem('selectedWorkspace')
    setCurrentWorkspace(undefined)
  }

  const login = () => {
    if (isAuthenticated) return Promise.resolve()
    return authenticationInstance.login()
  }
  const logout = () => {
    setCurrentWorkspace(undefined)
    return authenticationInstance.logout()
  }

  useEffect(function initiializeAuthentication() {
    const ensureLogoutDoesNotRedirect = () => {
      authenticationInstance.createLogoutUrl = function () {
        return (
          // @ts-expect-error - missing property in type definitions
          authenticationInstance.endpoints.logout() +
          '?id_token_hint=' +
          authenticationInstance.idToken +
          '&post_logout_redirect_uri=' +
          encodeURIComponent(window.location.href)
        )
      }
    }

    authenticationInstance.onTokenExpired = () => {
      authenticationInstance
        .updateToken()
        .then(() => {
          setToken(authenticationInstance.token)
        })
        .catch(() => {
          setIsAuthenticated(false)
          setUserInfo({})
          toast.error('Your session has expired. Please log in again.')
          void authenticationInstance.logout()
        })
    }

    authenticationInstance.onAuthLogout = () => {
      setIsAuthenticated(false)
      setUserInfo({})
      toast.error('You have been logged out by the system.')
    }

    if (authenticationInstance.didInitialize) return // this ensures vite HMR keeps working in development

    setIsAuthenticating(true)

    authenticationInstance
      .init({
        onLoad: initOptions.onLoad as KeycloakOnLoad,
        silentCheckSsoRedirectUri: `${location.origin}${BASE_PATH}/silent-check-sso.html`,
        responseMode: 'query',
      })
      // As soon as init settles, not after loadUserInfo, so pages see the login query for as
      // short a time as possible. This also runs before isAuthenticating clears, so the Open
      // Cosmos callback (which waits for it) navigates from the cleaned route.
      .finally(removeKeycloakParamsFromRouter)
      .then((auth) => {
        setIsAuthenticated(auth)

        if (auth) {
          ensureLogoutDoesNotRedirect()
          setToken(authenticationInstance.token)
          return authenticationInstance.loadUserInfo()
        }
      })
      .then((userInfo) => {
        setUserInfo(userInfo as KeycloakUserInfo)
      })
      .catch((error) => {
        setIsAuthenticationServiceError(true)
        // eslint-disable-next-line no-console
        console.error('Authentication error:', error)
      })
      .finally(() => {
        setIsAuthenticating(false)
      })
  }, [])

  useEffect(
    function initializeDefaultWorkspace() {
      if (!token) return
      const stored = localStorage.getItem('selectedWorkspace')
      if (stored) {
        setCurrentWorkspace(stored)
        return
      }
      fetchWorkspaces(token)
        .then((workspaces) => {
          if (workspaces.length > 0) {
            updateCurrentWorkspace(workspaces[0].name)
          }
        })
        .catch(() => {
          /* workspace fetch errors are non-critical */
        })
    },
    [token],
  )

  useEffect(
    function initializeAuthenticatedAxios() {
      if (isAuthenticated && !!token) {
        const getUpdatedToken = async () => {
          await authenticationInstance.updateToken()

          return authenticationInstance.token
        }

        const authenticatedAxios = getAuthenticatedAxios({
          token,
          getUpdatedToken,
        })

        setAuthenticatedAxios(() => {
          // because axios is a function, we have to use a function to add it to state
          // (so that it doesnt get called when being set)
          return authenticatedAxios
        })
      }
    },
    [isAuthenticated, token],
  )

  return (
    <AuthenticationContext.Provider
      value={{
        authenticatedAxios,
        isAuthenticated,
        isAuthenticating,
        isAuthenticationServiceError,
        login,
        logout,
        token,
        userInfo,
        workspaceUserName,
        currentWorkspace,
        updateCurrentWorkspace,
        clearCurrentWorkspace,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  )
}
