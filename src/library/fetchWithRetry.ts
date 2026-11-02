/** Statuses worth retrying: rate limited, or a gateway or upstream that is briefly unavailable. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504])

export interface RetryOptions {
  /** Retries after the first attempt, for retryable statuses. */
  retries?: number
  /**
   * Retries when fetch throws. The browser reports a dropped connection, a CORS block and a DNS
   * failure the same way, and only the first is worth waiting for, so keep this low.
   */
  networkRetries?: number
  /** Delay before the first retry, in ms. Doubles on each retry, plus jitter. */
  baseDelayMs?: number
  /** Longest wait between attempts, in ms. Also caps a server's Retry-After. */
  maxDelayMs?: number
  /** Replaceable in tests. */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Reads Retry-After as seconds or an HTTP date. Returns undefined when absent or invalid. */
const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now())
}

/**
 * fetch that retries rate-limited (429) and gateway (502, 503, 504) responses with exponential
 * backoff, and network errors once. Honours Retry-After. Returns the last response once retries
 * run out, so callers handle a failed response as they would with fetch.
 */
export const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  {
    retries = 3,
    networkRetries = 1,
    baseDelayMs = 500,
    maxDelayMs = 5000,
    sleep = defaultSleep,
  }: RetryOptions = {},
): Promise<Response> => {
  let networkFailures = 0
  for (let attempt = 0; ; attempt++) {
    const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt * (1 + Math.random() * 0.5))
    let response: Response
    try {
      response = await fetch(input, init)
    } catch (error) {
      networkFailures += 1
      if (networkFailures > networkRetries || init?.signal?.aborted) throw error
      await sleep(backoff)
      continue
    }
    if (!RETRYABLE_STATUSES.has(response.status) || attempt >= retries) return response
    const retryAfter = parseRetryAfter(response.headers.get('Retry-After'))
    // Release the discarded response's connection rather than leaving it to garbage collection.
    await response.body?.cancel().catch(() => undefined)
    await sleep(retryAfter === undefined ? backoff : Math.min(maxDelayMs, retryAfter))
  }
}
