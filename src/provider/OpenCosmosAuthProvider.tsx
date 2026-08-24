import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { OpenCosmosAuthContext, OpenCosmosUser } from '@/context/OpenCosmosAuthContext'

// Ported from eodhp-workspace-ui's OpenCosmosAuthContext, with three fixes: a `state` param
// is now generated and checked on callback (the original had none), the redirect-back
// handling accounts for this app's hash router — the original had no router at all, so it
// could rely on `window.location.pathname` alone to know where to return to — and it now
// checks/revokes the session via the backend GET/DELETE endpoints (see below), which the
// original didn't have available when it was written (docs/pending-backend-apis.md).

interface OpenCosmosSession {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope?: string
  tokenType?: string
  user?: OpenCosmosUser
  organizationId?: number
}

interface OpenCosmosTransaction {
  codeVerifier: string
  state: string
  returnToHash: string
  workspaceName: string
  organizationId: number
}

interface TokenExchangeResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type?: string
  id_token?: string
}

const OPEN_COSMOS_AUTH_DOMAIN = import.meta.env.VITE_OPEN_COSMOS_AUTH_DOMAIN as string | undefined
const OPEN_COSMOS_CLIENT_ID = import.meta.env.VITE_OPEN_COSMOS_CLIENT_ID as string | undefined
const OPEN_COSMOS_AUDIENCE = import.meta.env.VITE_OPEN_COSMOS_AUDIENCE as string | undefined
const OPEN_COSMOS_REDIRECT_URI = import.meta.env.VITE_OPEN_COSMOS_REDIRECT_URI as string | undefined
const OPEN_COSMOS_SCOPE =
  (import.meta.env.VITE_OPEN_COSMOS_SCOPE as string | undefined) ??
  'openid profile email offline_access'

const HUB_BASE_URL = import.meta.env.DEV ? '' : import.meta.env.VITE_HUB_BASE_URL
const TRANSACTION_STORAGE_KEY = 'openCosmosAuthTransaction'
const CODE_VERIFIER_BYTE_LENGTH = 64
const STATE_BYTE_LENGTH = 16
const DEFAULT_RETURN_HASH = '#/settings/provider-accounts'

// The redirect_uri is a static URL with no hash or query — the hash router's own route lives
// in the fragment, which the browser strips before sending the request, so the fallback below
// (origin + pathname) is stable regardless of which route `connect()` was called from.
const getRedirectUri = () => {
  if (OPEN_COSMOS_REDIRECT_URI) return OPEN_COSMOS_REDIRECT_URI
  return `${window.location.origin}${window.location.pathname}`
}

const getReturnHash = () => {
  if (window.location.hash) return window.location.hash
  return DEFAULT_RETURN_HASH
}

const persistTransaction = (transaction: OpenCosmosTransaction) => {
  sessionStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(transaction))
}

const readTransaction = (): OpenCosmosTransaction | undefined => {
  const stored = sessionStorage.getItem(TRANSACTION_STORAGE_KEY)
  if (!stored) return undefined

  try {
    return JSON.parse(stored) as OpenCosmosTransaction
  } catch {
    sessionStorage.removeItem(TRANSACTION_STORAGE_KEY)
    return undefined
  }
}

const clearTransaction = () => {
  sessionStorage.removeItem(TRANSACTION_STORAGE_KEY)
}

const base64UrlEncode = (bytes: Uint8Array) => {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const generateRandomString = (length: number) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

const createCodeChallenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(new Uint8Array(digest))
}

const parseJwtPayload = (token?: string): OpenCosmosUser | undefined => {
  if (!token) return undefined

  const [, payload] = token.split('.')
  if (!payload) return undefined

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const decoded = atob(padded)
    return JSON.parse(decoded) as OpenCosmosUser
  } catch {
    return undefined
  }
}

const buildSession = (
  tokenResponse: TokenExchangeResponse,
  fallbackUser?: OpenCosmosUser,
): OpenCosmosSession => ({
  accessToken: tokenResponse.access_token,
  refreshToken: tokenResponse.refresh_token,
  expiresAt: Date.now() + tokenResponse.expires_in * 1000,
  scope: tokenResponse.scope,
  tokenType: tokenResponse.token_type,
  user:
    parseJwtPayload(tokenResponse.id_token) ??
    parseJwtPayload(tokenResponse.access_token) ??
    fallbackUser,
})

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export const OpenCosmosAuthProvider = ({ children }: { children: ReactNode }) => {
  const { currentWorkspace, token } = useContext(AuthenticationContext)
  const callbackHandledRef = useRef(false)
  const checkedWorkspaceNameRef = useRef<string>()
  const [session, setSession] = useState<OpenCosmosSession>()
  const [hasStoredSession, setHasStoredSession] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  const hasConfiguration = useMemo(
    () => Boolean(OPEN_COSMOS_AUTH_DOMAIN && OPEN_COSMOS_CLIENT_ID && OPEN_COSMOS_AUDIENCE),
    [],
  )

  const exchangeToken = useCallback(async (params: URLSearchParams) => {
    if (!OPEN_COSMOS_AUTH_DOMAIN) {
      throw new Error('Open Cosmos authentication is not configured.')
    }

    const response = await fetch(new URL('/oauth/token', OPEN_COSMOS_AUTH_DOMAIN), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Open Cosmos token exchange failed.')
    }

    return (await response.json()) as TokenExchangeResponse
  }, [])

  const storeSession = useCallback(
    async (workspaceName: string, nextSession: OpenCosmosSession) => {
      if (!nextSession.refreshToken) {
        throw new Error('Open Cosmos did not return a refresh token.')
      }
      if (nextSession.organizationId === undefined) {
        throw new Error('Open Cosmos organization ID is required.')
      }
      if (!token) {
        throw new Error('Sign in before linking Open Cosmos.')
      }

      const sessionPayload = {
        accessToken: nextSession.accessToken,
        refreshToken: nextSession.refreshToken,
        expiresAt: nextSession.expiresAt,
        scope: nextSession.scope,
        tokenType: nextSession.tokenType,
        organization_id: nextSession.organizationId,
      }

      const response = await fetch(
        `${HUB_BASE_URL}/api/workspaces/${encodeURIComponent(workspaceName)}/open-cosmos/session`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionPayload),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Unable to store the Open Cosmos session.')
      }
    },
    [token],
  )

  const fetchSessionStatus = useCallback(
    async (workspaceName: string) => {
      if (!token) return false

      const response = await fetch(
        `${HUB_BASE_URL}/api/workspaces/${encodeURIComponent(workspaceName)}/open-cosmos/session`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!response.ok) {
        throw new Error('Unable to check the Open Cosmos session status.')
      }

      const status = (await response.json()) as { connected: boolean }
      return status.connected
    },
    [token],
  )

  // Detect a session already stored for the workspace so "Connected" survives a page
  // reload. Runs once per workspace (mount or switch); switching workspaces also drops
  // the previous workspace's local session, since it was never valid for the new one.
  useEffect(() => {
    if (!hasConfiguration || !currentWorkspace || !token) return
    if (checkedWorkspaceNameRef.current === currentWorkspace) return

    const isWorkspaceSwitch = checkedWorkspaceNameRef.current !== undefined
    checkedWorkspaceNameRef.current = currentWorkspace

    if (isWorkspaceSwitch) {
      setSession(undefined)
      setError(undefined)
    }

    let cancelled = false
    setIsLoading(true)

    fetchSessionStatus(currentWorkspace)
      .then((connected) => {
        if (!cancelled) setHasStoredSession(connected)
      })
      .catch(() => {
        if (!cancelled) setHasStoredSession(false)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentWorkspace, fetchSessionStatus, hasConfiguration, token])

  useEffect(() => {
    if (!hasConfiguration) return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')

    if (!code && !oauthError) return
    if (callbackHandledRef.current) return

    // OAuth authorization codes are single-use. StrictMode runs effects twice in development,
    // so mark this callback as handled before starting the asynchronous token exchange.
    callbackHandledRef.current = true

    const returnToRoute = () => {
      const transaction = readTransaction()
      const returnToHash = transaction?.returnToHash ?? DEFAULT_RETURN_HASH
      // Strip the ?code=/?error= query first, then assign `.hash` directly (rather than
      // folding it into one replaceState call) so the hash router's hashchange listener
      // actually picks up the route change and renders the right page.
      window.history.replaceState({}, document.title, window.location.pathname)
      window.location.hash = returnToHash
    }

    const handleCallback = async () => {
      setIsLoading(true)

      try {
        if (oauthError) {
          throw new Error(params.get('error_description') ?? 'Open Cosmos sign-in failed.')
        }

        if (!code) {
          throw new Error('Open Cosmos callback is missing the authorization code.')
        }

        const transaction = readTransaction()
        if (!transaction) {
          throw new Error('Open Cosmos sign-in session was not found.')
        }

        const returnedState = params.get('state')
        if (!returnedState || returnedState !== transaction.state) {
          throw new Error('Open Cosmos sign-in could not be verified — please try again.')
        }

        if (!OPEN_COSMOS_CLIENT_ID) {
          throw new Error('Open Cosmos OAuth configuration is incomplete.')
        }

        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: OPEN_COSMOS_CLIENT_ID,
          code,
          code_verifier: transaction.codeVerifier,
          redirect_uri: getRedirectUri(),
        })

        const tokenResponse = await exchangeToken(body)
        const nextSession = {
          ...buildSession(tokenResponse),
          organizationId: transaction.organizationId,
        }

        await storeSession(transaction.workspaceName, nextSession)
        setSession(nextSession)
        setError(undefined)
        clearTransaction()
        returnToRoute()
      } catch (callbackError) {
        const message = toErrorMessage(callbackError, 'Open Cosmos sign-in failed.')
        clearTransaction()
        setSession(undefined)
        setError(message)
        toast.error(message)
        returnToRoute()
      } finally {
        setIsLoading(false)
      }
    }

    void handleCallback()
  }, [exchangeToken, hasConfiguration, storeSession])

  const connect = useCallback(
    async (organizationId: number) => {
      if (!hasConfiguration || !OPEN_COSMOS_AUTH_DOMAIN || !OPEN_COSMOS_CLIENT_ID) {
        const message = 'Open Cosmos authentication is not configured.'
        setError(message)
        toast.error(message)
        return
      }

      setIsLoading(true)
      setError(undefined)

      try {
        if (!currentWorkspace) {
          throw new Error('Select a workspace before connecting Open Cosmos.')
        }
        if (organizationId === undefined || organizationId < 0) {
          throw new Error('Enter a valid Open Cosmos organization ID before connecting.')
        }

        const codeVerifier = generateRandomString(CODE_VERIFIER_BYTE_LENGTH)
        const codeChallenge = await createCodeChallenge(codeVerifier)
        const state = generateRandomString(STATE_BYTE_LENGTH)

        persistTransaction({
          codeVerifier,
          state,
          returnToHash: getReturnHash(),
          workspaceName: currentWorkspace,
          organizationId,
        })

        const authorizeUrl = new URL('/authorize', OPEN_COSMOS_AUTH_DOMAIN)
        authorizeUrl.searchParams.set('response_type', 'code')
        authorizeUrl.searchParams.set('client_id', OPEN_COSMOS_CLIENT_ID)
        authorizeUrl.searchParams.set('redirect_uri', getRedirectUri())
        authorizeUrl.searchParams.set('scope', OPEN_COSMOS_SCOPE)
        authorizeUrl.searchParams.set('code_challenge', codeChallenge)
        authorizeUrl.searchParams.set('code_challenge_method', 'S256')
        authorizeUrl.searchParams.set('state', state)

        if (OPEN_COSMOS_AUDIENCE) {
          authorizeUrl.searchParams.set('audience', OPEN_COSMOS_AUDIENCE)
        }

        window.location.assign(authorizeUrl.toString())
      } catch (connectError) {
        const message = toErrorMessage(connectError, 'Unable to start Open Cosmos sign-in.')
        setError(message)
        setIsLoading(false)
        toast.error(message)
      }
    },
    [currentWorkspace, hasConfiguration],
  )

  // Drops this browser's copy of the token without touching the backend-stored,
  // workspace-shared session. disconnect() below is the only thing allowed to revoke
  // that session — this must never attempt it.
  const clearLocalSession = useCallback(() => {
    clearTransaction()
    setSession(undefined)
    setHasStoredSession(false)
    setError(undefined)
  }, [])

  const disconnect = useCallback(async () => {
    if (currentWorkspace && token) {
      setIsLoading(true)

      try {
        const response = await fetch(
          `${HUB_BASE_URL}/api/workspaces/${encodeURIComponent(currentWorkspace)}/open-cosmos/session`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          },
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || 'Unable to disconnect Open Cosmos.')
        }
      } catch (disconnectError) {
        // Deliberately leaves local/reported state untouched: the backend session may
        // still be live (e.g. this user isn't the account owner), so we must not claim
        // disconnected when we can't confirm it was actually revoked.
        const message = toErrorMessage(disconnectError, 'Unable to disconnect Open Cosmos.')
        setError(message)
        toast.error(message)
        return
      } finally {
        setIsLoading(false)
      }
    }

    clearLocalSession()
  }, [clearLocalSession, currentWorkspace, token])

  return (
    <OpenCosmosAuthContext.Provider
      value={{
        isConnected: Boolean(session?.accessToken) || hasStoredSession,
        isLoading,
        hasConfiguration,
        error,
        user: session?.user,
        connect,
        disconnect,
      }}
    >
      {children}
    </OpenCosmosAuthContext.Provider>
  )
}
