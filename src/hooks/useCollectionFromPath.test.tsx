import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import type { Collection } from '@/types'
import { useCollectionFromPath } from './useCollectionFromPath'
import { fetchCollections, fetchUserCollections } from '@/services/collectionService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'

vi.mock('@/services/collectionService', () => ({
  fetchCollections: vi.fn(),
  fetchUserCollections: vi.fn(),
  fetchJobCollection: vi.fn(),
}))

vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(),
}))

const sentinel = { id: 'sentinel2_ard', links: [] } as unknown as Collection
const airbus = { id: 'airbus_sar_data', links: [] } as unknown as Collection

type AuthValue = React.ContextType<typeof AuthenticationContext>

const signedIn: Partial<AuthValue> = {
  isAuthenticated: true,
  token: 'user-token',
  userInfo: { sub: 'user-1' },
  currentWorkspace: 'current-ws',
}

const renderUseCollectionFromPath = (
  path: string,
  auth: Partial<AuthValue> = {},
  options?: { workspace?: string },
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const value = {
    isAuthenticated: false,
    isAuthenticating: false,
    isAuthenticationServiceError: false,
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    token: undefined,
    updateCurrentWorkspace: () => undefined,
    clearCurrentWorkspace: () => undefined,
    ...auth,
  } as AuthValue
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>
    </QueryClientProvider>
  )
  return renderHook(() => useCollectionFromPath(path, options), { wrapper })
}

describe('useCollectionFromPath', () => {
  beforeEach(() => {
    vi.mocked(fetchCollections).mockReset().mockResolvedValue([sentinel])
    vi.mocked(fetchUserCollections).mockReset().mockResolvedValue([airbus])
    vi.mocked(fetchWorkspaceTokens)
      .mockReset()
      .mockImplementation(
        (workspace) => Promise.resolve({ access: `token-for-${workspace}` }) as never,
      )
  })

  it('finds a public collection without signing in', async () => {
    const { result } = renderUseCollectionFromPath('sentinel2_ard')
    await waitFor(() => expect(result.current.status).toBe('found'))
    expect(result.current.collection).toBe(sentinel)
    expect(result.current.isUserCollection).toBe(false)
    expect(result.current.workspaceToken).toBeUndefined()
  })

  it('reports a missing public collection', async () => {
    const { result } = renderUseCollectionFromPath('does-not-exist')
    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })

  it('asks signed-out users to sign in for my- collections', async () => {
    const { result } = renderUseCollectionFromPath('my-airbus_sar_data')
    await waitFor(() => expect(result.current.status).toBe('needs-auth'))
  })

  it('reports a missing workspace for my- collections', async () => {
    const { result } = renderUseCollectionFromPath('my-airbus_sar_data', {
      ...signedIn,
      currentWorkspace: undefined,
    })
    await waitFor(() => expect(result.current.status).toBe('no-workspace'))
  })

  it('resolves my- collections in the workspace override, not the current one', async () => {
    const { result } = renderUseCollectionFromPath('my-airbus_sar_data', signedIn, {
      workspace: 'other-ws',
    })
    await waitFor(() => expect(result.current.status).toBe('found'))
    expect(result.current.collection).toBe(airbus)
    expect(result.current.isUserCollection).toBe(true)
    expect(result.current.workspace).toBe('other-ws')
    expect(result.current.workspaceToken).toBe('token-for-other-ws')
    expect(fetchUserCollections).toHaveBeenCalledWith('other-ws', 'token-for-other-ws')
  })

  it('reports no-access when the workspace token cannot be fetched', async () => {
    vi.mocked(fetchWorkspaceTokens).mockRejectedValue(new Error('Forbidden'))
    const { result } = renderUseCollectionFromPath('my-airbus_sar_data', signedIn, {
      workspace: 'not-a-member',
    })
    await waitFor(() => expect(result.current.status).toBe('no-access'))
  })

  it('reports a missing workspace for legacy job paths with no current workspace', async () => {
    const { result } = renderUseCollectionFromPath('processing-results/catalogs/wf/collections/c', {
      ...signedIn,
      currentWorkspace: undefined,
    })
    await waitFor(() => expect(result.current.status).toBe('no-workspace'))
  })
})
