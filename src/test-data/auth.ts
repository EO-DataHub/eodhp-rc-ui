import React from 'react'
import { vi } from 'vitest'
import { AuthenticationContext } from '@/context/AuthenticationContext'

export type AuthValue = React.ContextType<typeof AuthenticationContext>

/** A signed-in authentication context value for component tests. */
export const authValue = (overrides: Partial<AuthValue> = {}): AuthValue => ({
  isAuthenticated: true,
  isAuthenticating: false,
  isAuthenticationServiceError: false,
  isHubAdmin: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  token: 'tok',
  userInfo: { preferred_username: 'alice', sub: 'user-1' },
  workspaceUserName: 'alice',
  currentWorkspace: 'ws-alpha',
  updateCurrentWorkspace: vi.fn(),
  clearCurrentWorkspace: vi.fn(),
  ...overrides,
})
