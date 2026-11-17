import { afterEach, describe, expect, it, vi } from 'vitest'

import { validateLinkedAccountKey } from './linkedAccountsService'

const mockFetch = (status: number, body: string) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body || null, { status }))

describe('validateLinkedAccountKey', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves when the provider returns 200 with an empty body (Planet)', async () => {
    mockFetch(200, '')
    await expect(validateLinkedAccountKey('ws1', 'token', 'planet', 'abc')).resolves.toEqual({
      name: 'planet',
      key: 'abc',
    })
  })

  it('returns the parsed body when the provider returns JSON (Airbus)', async () => {
    const payload = {
      name: 'airbus',
      key: 'abc',
      contracts: { sar: true, optical: { c1: 'LEGACY' } },
    }
    mockFetch(200, JSON.stringify(payload))
    await expect(validateLinkedAccountKey('ws1', 'token', 'airbus', 'abc')).resolves.toEqual(
      payload,
    )
  })

  it('throws the API key error when validation fails', async () => {
    mockFetch(401, '"Invalid or unauthorized token for Planet API"')
    await expect(validateLinkedAccountKey('ws1', 'token', 'planet', 'bad')).rejects.toThrow(
      'Error validating account, please check your API key',
    )
  })
})
