import { createContext } from 'react'
import { AxiosInstance } from 'axios'

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
  // Holds the `hub_admin` realm role, which grants reads across every workspace.
  isHubAdmin: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  token: string | undefined
  userInfo?: KeycloakUserInfo
  workspaceUserName?: string
  currentWorkspace?: string
  updateCurrentWorkspace: (workspace: string) => void
  clearCurrentWorkspace: () => void
}

export const AuthenticationContext = createContext<AuthenticationContextValue>({
  isAuthenticated: false,
  isAuthenticating: false,
  isAuthenticationServiceError: false,
  isHubAdmin: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  token: undefined,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  updateCurrentWorkspace: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  clearCurrentWorkspace: () => {},
})
