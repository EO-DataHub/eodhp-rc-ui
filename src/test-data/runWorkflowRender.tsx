import React from 'react'
import { vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'

export type AuthValue = React.ContextType<typeof AuthenticationContext>

export const signedInAuth = (overrides: Partial<AuthValue> = {}): AuthValue => ({
  isAuthenticated: true,
  isAuthenticating: false,
  isAuthenticationServiceError: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  token: 'token',
  userInfo: { preferred_username: 'alice', sub: 'alice-id' },
  workspaceUserName: 'alice',
  currentWorkspace: 'my-ws',
  updateCurrentWorkspace: vi.fn(),
  clearCurrentWorkspace: vi.fn(),
  ...overrides,
})

interface ProviderOptions {
  auth?: AuthValue
  /** The URL to start at. */
  url?: string
  /** The route pattern the element is rendered at, for pages that read URL parameters. */
  path?: string
}

/** Wraps a component in the router, query client, sign-in and theme that the app provides. */
export const withProviders = (
  ui: React.ReactNode,
  { auth = signedInAuth(), url = '/', path }: ProviderOptions = {},
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={queryClient}>
        <AuthenticationContext.Provider value={auth}>
          <Theme>
            {path ? (
              <Routes>
                <Route path={path} element={ui} />
              </Routes>
            ) : (
              ui
            )}
          </Theme>
        </AuthenticationContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  )
}
