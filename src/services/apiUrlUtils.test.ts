import { beforeEach, describe, expect, it, vi } from 'vitest'

const load = async () => {
  vi.resetModules()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://eodatahub.org.uk')
  vi.stubEnv('VITE_WORKSPACES_DOMAIN', 'eodatahub-workspaces.org.uk')
  return import('./apiUrlUtils')
}

describe('canSendWorkspaceToken', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    // setupTests.ts stubs URL for createObjectURL; these tests need the real constructor.
    vi.unstubAllGlobals()
  })

  it('allows the hub origin', async () => {
    const { canSendWorkspaceToken } = await load()
    expect(canSendWorkspaceToken(new URL('https://eodatahub.org.uk/api/x'), 'ws1')).toBe(true)
  })

  it("allows the current workspace's own host", async () => {
    const { canSendWorkspaceToken } = await load()
    const url = new URL(
      'https://ws1.eodatahub-workspaces.org.uk/files/workspaces-eodhp/processing-results/a.json',
    )
    expect(canSendWorkspaceToken(url, 'ws1')).toBe(true)
  })

  it.each([
    ['another workspace', 'https://ws2.eodatahub-workspaces.org.uk/a.json'],
    ['plain http', 'http://ws1.eodatahub-workspaces.org.uk/a.json'],
    ['a look-alike domain', 'https://ws1.eodatahub-workspaces.org.uk.evil.com/a.json'],
    ['a different port', 'https://ws1.eodatahub-workspaces.org.uk:8443/a.json'],
    ['an unrelated server', 'https://evil.com/a.json'],
  ])('rejects %s', async (_, href) => {
    const { canSendWorkspaceToken } = await load()
    expect(canSendWorkspaceToken(new URL(href), 'ws1')).toBe(false)
  })

  it('rejects workspace hosts when no workspace is selected', async () => {
    const { canSendWorkspaceToken } = await load()
    expect(canSendWorkspaceToken(new URL('https://ws1.eodatahub-workspaces.org.uk/a.json'))).toBe(
      false,
    )
  })
})
