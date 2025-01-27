import { useEffect, useState } from 'react'
import { ReactNode, createContext } from 'react'
import Keycloak, { KeycloakOnLoad } from 'keycloak-js'
import { getAuthenticatedAxios } from '../library/axios'
import { AxiosInstance } from 'axios'
import { toast } from 'react-toastify'

export interface KeycloakUserInfo {
  sub?: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  email?: string
}

interface AuthenticationContextValue {
  authenticatedAxios?: AxiosInstance
  isAuthenticated: boolean
  isAuthenticating: boolean
  isAuthenticationServiceError: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  token: string | undefined
  userInfo?: KeycloakUserInfo
  workspaceUserName?: string
}

const initOptions = {
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: import.meta.env.VITE_KEYCLOAK_REALM as string,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
  onLoad: 'check-sso',
}

const authenticationInstance = new Keycloak(initOptions)

export const AuthenticationContext = createContext<AuthenticationContextValue>({
  isAuthenticated: false,
  isAuthenticating: false,
  isAuthenticationServiceError: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  token: undefined,
})

export const AuthenticationContextProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false)
  const [isAuthenticationServiceError, setIsAuthenticationServiceError] = useState<boolean>(false)
  const [authenticatedAxios, setAuthenticatedAxios] = useState<AxiosInstance | undefined>()
  const [userInfo, setUserInfo] = useState<KeycloakUserInfo>({})
  const [token, setToken] = useState<string>() // we track this to trigger axios reinitialization
  const workspaceUserName = userInfo?.preferred_username?.replace('-', '_')

  const login = () => {
    if (isAuthenticated) return Promise.resolve()
    return authenticationInstance.login()
  }
  const logout = () => {
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
        silentCheckSsoRedirectUri: `${location.origin}/silent-check-sso.html`,
      })
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
      .catch(() => {
        setIsAuthenticationServiceError(true)
      })
      .finally(() => {
        setIsAuthenticating(false)
      })
  }, [])

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
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  )
}
