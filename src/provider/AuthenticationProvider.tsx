import { useEffect, useState } from 'react'
import { ReactNode } from 'react'
import Keycloak, { KeycloakOnLoad } from 'keycloak-js'
import { AuthenticationContext, KeycloakUserInfo } from '@/context/AuthenticationContext'
import { getAuthenticatedAxios } from '../library/axios'
import { AxiosInstance } from 'axios'
import { toast } from 'react-toastify'

const BASE_PATH = import.meta.env.VITE_BASE_PATH || ''

const initOptions = {
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: import.meta.env.VITE_KEYCLOAK_REALM as string,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
  onLoad: 'check-sso',
  scope: 'workspaces',
}

const authenticationInstance = new Keycloak(initOptions)

const WORKSPACE_STORAGE_KEY = 'selectedWorkspace'

export const AuthenticationContextProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false)
  const [isAuthenticationServiceError, setIsAuthenticationServiceError] = useState<boolean>(false)
  const [authenticatedAxios, setAuthenticatedAxios] = useState<AxiosInstance | undefined>()
  const [userInfo, setUserInfo] = useState<KeycloakUserInfo>({})
  const [token, setToken] = useState<string>() // we track this to trigger axios reinitialization
  const workspaceUserName = userInfo?.preferred_username
  const [currentWorkspace, setCurrentWorkspace] = useState<string | undefined>(() => {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? workspaceUserName
  })
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | undefined>(() => {
    // Initialize from localStorage if available
    return localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? undefined
  })
  const [showWorkspaceModal, setShowWorkspaceModal] = useState<boolean>(false)
  const availableWorkspaces = userInfo?.member_groups ?? []

  const updateCurrentWorkspace = (workspace: string) => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace)
    setCurrentWorkspace(workspace)
  }

  const clearCurrentWorkspace = () => {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY)
    setCurrentWorkspace(workspaceUserName)
  }

  // Update localStorage and currentWorkspace when selectedWorkspace changes
  useEffect(() => {
    if (selectedWorkspace) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, selectedWorkspace)
      setCurrentWorkspace(selectedWorkspace)
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY)
      setCurrentWorkspace(workspaceUserName)
    }
  }, [selectedWorkspace, workspaceUserName])

  const login = () => {
    if (isAuthenticated) return Promise.resolve()
    return authenticationInstance.login()
  }
  const logout = () => {
    // Clear selected workspace on logout
    localStorage.removeItem(WORKSPACE_STORAGE_KEY)
    setSelectedWorkspace(undefined)
    clearCurrentWorkspace()
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
      .then((auth) => {
        setIsAuthenticated(auth)

        if (auth) {
          ensureLogoutDoesNotRedirect()
          setToken(authenticationInstance.token)
          return authenticationInstance.loadUserInfo()
        }
      })
      .then((userInfo) => {
        const keycloakUserInfo = userInfo as KeycloakUserInfo
        setUserInfo(keycloakUserInfo)
        const defaultWorkspace = keycloakUserInfo?.preferred_username
        if (!localStorage.getItem(WORKSPACE_STORAGE_KEY)) {
          setCurrentWorkspace(defaultWorkspace)
        }

        // Only show workspace modal if we have workspaces and no workspace is selected
        // or if the selected workspace is not in the available workspaces
        const storedWorkspace = localStorage.getItem(WORKSPACE_STORAGE_KEY)
        const workspaces = keycloakUserInfo.member_groups ?? []
        if (workspaces.length > 0 && (!storedWorkspace || !workspaces.includes(storedWorkspace))) {
          setShowWorkspaceModal(true)
        }
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
        selectedWorkspace,
        setSelectedWorkspace,
        availableWorkspaces,
        showWorkspaceModal,
        setShowWorkspaceModal,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  )
}
