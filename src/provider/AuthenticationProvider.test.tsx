import { useContext } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { AuthenticationContextProvider } from './AuthenticationProvider'

interface FakeKeycloak {
  token: string
  onTokenExpired?: () => void
  hasRealmRole: ReturnType<typeof vi.fn>
}

const keycloak = vi.hoisted(() => ({
  instance: undefined as unknown as FakeKeycloak,
  authenticated: true,
  roles: ['hub_admin'] as string[],
}))

vi.mock('keycloak-js', () => ({
  default: class {
    didInitialize = false
    token = 'tok-1'
    idToken = 'id-tok'
    onTokenExpired?: () => void
    onAuthLogout?: () => void
    constructor() {
      keycloak.instance = this as unknown as FakeKeycloak
    }
    init = vi.fn(() => Promise.resolve(keycloak.authenticated))
    loadUserInfo = vi.fn(() => Promise.resolve({ preferred_username: 'alice' }))
    hasRealmRole = vi.fn((role: string) => keycloak.roles.includes(role))
    updateToken = vi.fn(() => Promise.resolve(true))
    login = vi.fn(() => Promise.resolve())
    logout = vi.fn(() => Promise.resolve())
  },
}))
vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaces: vi.fn(() => Promise.resolve([])),
}))
vi.mock('@/library/axios', () => ({ getAuthenticatedAxios: vi.fn(() => ({})) }))

const Probe = () => {
  const { isHubAdmin, token } = useContext(AuthenticationContext)
  return (
    <div>
      <span data-testid="hub-admin">{String(isHubAdmin)}</span>
      <span data-testid="token">{token ?? 'none'}</span>
    </div>
  )
}

const renderProvider = () =>
  render(
    <AuthenticationContextProvider>
      <Probe />
    </AuthenticationContextProvider>,
  )

beforeEach(() => {
  keycloak.authenticated = true
  keycloak.roles = ['hub_admin']
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  })
})

describe('Stage 1: isHubAdmin in the authentication context', () => {
  it('defaults to false in the context', () => {
    render(<Probe />)
    expect(screen.getByTestId('hub-admin')).toHaveTextContent('false')
  })

  it('is true when the token has the hub_admin realm role', async () => {
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-1'))
    expect(screen.getByTestId('hub-admin')).toHaveTextContent('true')
    expect(keycloak.instance.hasRealmRole).toHaveBeenCalledWith('hub_admin')
  })

  it('is false when the token lacks the hub_admin realm role', async () => {
    keycloak.roles = ['offline_access', 'workspace_admin']
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-1'))
    expect(screen.getByTestId('hub-admin')).toHaveTextContent('false')
  })

  it('is false when the user is not signed in', async () => {
    keycloak.authenticated = false
    keycloak.roles = []
    renderProvider()
    await waitFor(() => expect(keycloak.instance.hasRealmRole).toBeDefined())
    expect(screen.getByTestId('hub-admin')).toHaveTextContent('false')
  })

  it('is updated when the token is refreshed', async () => {
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('hub-admin')).toHaveTextContent('true'))

    keycloak.roles = []
    keycloak.instance.token = 'tok-2'
    act(() => {
      keycloak.instance.onTokenExpired?.()
    })

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-2'))
    expect(screen.getByTestId('hub-admin')).toHaveTextContent('false')

    keycloak.roles = ['hub_admin']
    keycloak.instance.token = 'tok-3'
    act(() => {
      keycloak.instance.onTokenExpired?.()
    })

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-3'))
    expect(screen.getByTestId('hub-admin')).toHaveTextContent('true')
  })
})
