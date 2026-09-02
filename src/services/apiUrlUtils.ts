const API_URL = import.meta.env.VITE_HUB_BASE_URL as string | undefined

/**
 * In dev, go through Vite's /api proxy (see vite.config.ts) instead of calling
 * VITE_HUB_BASE_URL directly, since the auth-agent-backed tokens endpoints
 * aren't CORS-enabled for cross-origin callers like a local dev server.
 */
export const getTokensBaseUrl = (): string => (import.meta.env.DEV ? '' : API_URL ?? '')

/**
 * Returns the canonical origin for the hub API.
 * Falls back to window.location.origin in the browser if the API_URL
 * cannot be parsed.
 */
export const getHubOrigin = (): string => {
  if (API_URL) {
    try {
      return new URL(API_URL).origin
    } catch {
      // fall through to window.origin fallback
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  // Last resort: return the raw API_URL (may not be a valid origin string)
  return API_URL ?? ''
}

/**
 * Resolves a potentially relative API URL against the hub base URL.
 * Absolute URLs are returned as-is.
 */
export const resolveApiUrl = (resourceUrl: string): URL => {
  if (!resourceUrl) {
    throw new Error('URL is required')
  }

  if (resourceUrl.startsWith('http://') || resourceUrl.startsWith('https://')) {
    return new URL(resourceUrl)
  }

  const base = API_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return new URL(resourceUrl, base)
}

/**
 * Returns true if the given URL belongs to the hub origin.
 */
export const isHubOriginUrl = (url: URL): boolean => {
  return url.origin === getHubOrigin()
}
