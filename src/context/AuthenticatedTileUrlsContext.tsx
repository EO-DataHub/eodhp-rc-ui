import { createContext } from 'react'

export type TokenType = 'keycloak' | 'workspace'

export interface AuthenticatedTileUrlsContextValue {
  registerUrl: (baseUrl: string, tokenType?: TokenType) => void
  unregisterUrl: (baseUrl: string) => void
  isAuthenticated: (url: string) => boolean
  getTokenType: (url: string) => TokenType | undefined
}

export const AuthenticatedTileUrlsContext = createContext<AuthenticatedTileUrlsContextValue | null>(
  null,
)
