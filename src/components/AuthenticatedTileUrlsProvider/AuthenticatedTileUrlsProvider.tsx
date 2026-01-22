import { useState, useCallback, ReactNode, useRef, useEffect } from 'react'
import {
  AuthenticatedTileUrlsContext,
  type AuthenticatedTileUrlsContextValue,
  type TokenType,
} from '../../context/AuthenticatedTileUrlsContext'

interface AuthenticatedTileUrlsProviderProps {
  children: ReactNode
}

export function AuthenticatedTileUrlsProvider({ children }: AuthenticatedTileUrlsProviderProps) {
  const [registeredUrls, setRegisteredUrls] = useState<Map<string, TokenType>>(new Map())
  // Use a ref to always have the latest registeredUrls value in callbacks
  const registeredUrlsRef = useRef<Map<string, TokenType>>(new Map())

  // Keep ref in sync with state
  useEffect(() => {
    registeredUrlsRef.current = registeredUrls
  }, [registeredUrls])

  const registerUrl = useCallback((baseUrl: string, tokenType: TokenType = 'keycloak') => {
    setRegisteredUrls((prev) => {
      const next = new Map(prev)
      next.set(baseUrl, tokenType)
      registeredUrlsRef.current = next // Update ref immediately
      return next
    })
  }, [])

  const unregisterUrl = useCallback((baseUrl: string) => {
    setRegisteredUrls((prev) => {
      const next = new Map(prev)
      next.delete(baseUrl)
      registeredUrlsRef.current = next // Update ref immediately
      return next
    })
  }, [])

  const extractBaseUrl = useCallback((url: string) => {
    // Extract base URL (before coordinates or placeholders)
    // Remove query string first, then remove coordinates
    const urlWithoutQuery = url.split('?')[0]
    return urlWithoutQuery
      .replace(/\/\d+\/\d+\/\d+@\d+x?$/, '')
      .replace(/\/\d+\/\d+\/\d+$/, '')
      .replace(/\/\{z\}\/\{x\}\/\{y\}@\d+x?$/, '')
      .replace(/\/\{z\}\/\{x\}\/\{y\}$/, '')
  }, [])

  const isAuthenticated = useCallback(
    (url: string) => {
      const baseUrl = extractBaseUrl(url)
      // Use ref to get the latest value, avoiding stale closures
      const currentUrls = registeredUrlsRef.current
      const isRegistered = currentUrls.has(baseUrl)
      return isRegistered
    },
    [extractBaseUrl],
  )

  const getTokenType = useCallback(
    (url: string): TokenType | undefined => {
      const baseUrl = extractBaseUrl(url)
      // Use ref to get the latest value, avoiding stale closures
      const currentUrls = registeredUrlsRef.current
      return currentUrls.get(baseUrl)
    },
    [extractBaseUrl],
  )

  const value: AuthenticatedTileUrlsContextValue = {
    registerUrl,
    unregisterUrl,
    isAuthenticated,
    getTokenType,
  }

  return (
    <AuthenticatedTileUrlsContext.Provider value={value}>
      {children}
    </AuthenticatedTileUrlsContext.Provider>
  )
}
