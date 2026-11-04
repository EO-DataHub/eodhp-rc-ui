import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithRetry } from './fetchWithRetry'

const response = (status: number, headers: Record<string, string> = {}) =>
  new Response(status === 200 ? '{}' : null, { status, headers })

const mockFetch = (...results: (Response | Error)[]) => {
  const fn = vi.fn()
  for (const result of results) {
    if (result instanceof Error) fn.mockRejectedValueOnce(result)
    else fn.mockResolvedValueOnce(result)
  }
  vi.stubGlobal('fetch', fn)
  return fn
}

const noSleep = vi.fn(() => Promise.resolve())

afterEach(() => {
  vi.unstubAllGlobals()
  noSleep.mockClear()
})

describe('fetchWithRetry', () => {
  it('returns the first response when it is not retryable', async () => {
    const fetch = mockFetch(response(404))
    const result = await fetchWithRetry('https://hub.example/x', undefined, { sleep: noSleep })
    expect(result.status).toBe(404)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(noSleep).not.toHaveBeenCalled()
  })

  it('retries 429 and gateway errors until one succeeds', async () => {
    const fetch = mockFetch(response(429), response(503), response(200))
    const result = await fetchWithRetry('https://hub.example/x', undefined, { sleep: noSleep })
    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('returns the last response when retries run out', async () => {
    const fetch = mockFetch(response(429), response(429), response(429))
    const result = await fetchWithRetry('https://hub.example/x', undefined, {
      retries: 2,
      sleep: noSleep,
    })
    expect(result.status).toBe(429)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('waits for Retry-After, capped at maxDelayMs', async () => {
    mockFetch(
      response(429, { 'Retry-After': '2' }),
      response(429, { 'Retry-After': '60' }),
      response(200),
    )
    await fetchWithRetry('https://hub.example/x', undefined, { maxDelayMs: 5000, sleep: noSleep })
    expect(noSleep.mock.calls).toEqual([[2000], [5000]])
  })

  it('retries network errors and rethrows the last one', async () => {
    const fetch = mockFetch(new TypeError('offline'), new TypeError('still offline'))
    await expect(
      fetchWithRetry('https://hub.example/x', undefined, { retries: 1, sleep: noSleep }),
    ).rejects.toThrow('still offline')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('retries a network error only once, however many status retries are allowed', async () => {
    const fetch = mockFetch(new TypeError('blocked'), new TypeError('blocked'), response(200))
    await expect(
      fetchWithRetry('https://hub.example/x', undefined, { retries: 3, sleep: noSleep }),
    ).rejects.toThrow('blocked')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('cancels the body of a response it retries', async () => {
    const first = response(503)
    const cancel = vi.fn(() => Promise.resolve())
    Object.defineProperty(first, 'body', { value: { cancel } })
    mockFetch(first, response(200))
    await fetchWithRetry('https://hub.example/x', undefined, { sleep: noSleep })
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})
