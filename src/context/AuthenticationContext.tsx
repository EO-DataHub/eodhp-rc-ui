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
  login: () => Promise<void>
  logout: () => Promise<void>
  token: string | undefined
  userInfo?: KeycloakUserInfo
  workspaceUserName?: string
}

export const AuthenticationContext = createContext<AuthenticationContextValue>({
  isAuthenticated: false,
  isAuthenticating: false,
  isAuthenticationServiceError: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  token: undefined,
})
