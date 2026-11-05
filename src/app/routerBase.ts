/**
 * The app's base path without the trailing slash: '' when served from '/', or for example
 * '/static-apps/sg-rc-ui/prod'. Vite sets BASE_URL from the `base` config (VITE_BASE_PATH)
 * and always ends it with '/'.
 */
export const APP_BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '')

/** The router `basename`. React Router expects '/' rather than '' for the root. */
export const ROUTER_BASENAME = APP_BASE_PATH || '/'

/**
 * The route in an old hash-router fragment, such as '#/finder/x?items=a' -> '/finder/x?items=a'.
 * Returns null for anything that is not a hash route, such as '#' or Keycloak's
 * '#state=…&code=…', so those are left alone.
 */
export function hashRouteToPath(hash: string): string | null {
  return hash.startsWith('#/') ? hash.slice(1) : null
}

interface UrlParts {
  pathname: string
  search: string
  hash: string
}

/**
 * The path URL for an old-style URL, or null if the URL needs no change:
 * - '<base>/#/route?q' -> '<base>/route?q'. The site used hash routing until the switch to
 *   browser routing, so bookmarks and shared permalinks still use this form. Keep this.
 * - '<base>/index.html?q' -> '<base>/?q'. Test and staging links, and the Open Cosmos
 *   redirect URI, point at index.html.
 */
export function legacyUrlToPathUrl(url: UrlParts, basePath: string = APP_BASE_PATH): string | null {
  let { pathname, search, hash } = url
  let changed = false

  if (pathname === `${basePath}/index.html`) {
    pathname = `${basePath}/`
    changed = true
  }

  const route = hashRouteToPath(hash)
  if (route !== null) {
    const queryStart = route.indexOf('?')
    const routePath = queryStart === -1 ? route : route.slice(0, queryStart)
    const routeSearch = queryStart === -1 ? '' : route.slice(queryStart)
    pathname = `${basePath}${routePath}`
    // The hash route's own query wins. Otherwise keep any query from before the '#'.
    search = routeSearch || search
    hash = ''
    changed = true
  }

  return changed ? `${pathname}${search}${hash}` : null
}

/**
 * The route for a full pathname: the pathname without the base path, for example
 * '/static-apps/sg-rc-ui/prod/my-data' -> '/my-data'. The app root is '/'.
 *
 * Use this on `router.state.location.pathname` before passing it to `router.navigate()`.
 * In React Router 7 the router's own location keeps the base path, and `navigate()` adds the
 * base path again, so navigating to the unchanged pathname doubles it
 * ('/rc/pr-1/rc/pr-1/'). Hooks such as useLocation() strip it already.
 */
export function pathnameToRoute(pathname: string, basePath: string = APP_BASE_PATH): string {
  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    return pathname.slice(basePath.length) || '/'
  }
  return pathname
}

/**
 * The query parameters keycloak-js reads from a login redirect (responseMode 'query') and then
 * removes from the address bar. Matches `supportedParams` in keycloak-js 26 for the standard
 * flow, plus the error params.
 */
export const KEYCLOAK_CALLBACK_PARAMS = [
  'code',
  'state',
  'session_state',
  'iss',
  'kc_action',
  'kc_action_status',
  'error',
  'error_description',
  'error_uri',
] as const

/**
 * The search string without Keycloak's login-redirect params, for example
 * '?tab=x&state=a&code=b' -> '?tab=x'. Returns null if there are none to remove.
 */
export function withoutKeycloakCallbackParams(search: string): string | null {
  const params = new URLSearchParams(search)
  const present = KEYCLOAK_CALLBACK_PARAMS.filter((name) => params.has(name))
  if (present.length === 0) return null
  present.forEach((name) => params.delete(name))
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}

/**
 * Rewrite an old-style URL in place, without a reload. Call this before the router is
 * created, so the router reads the rewritten URL.
 */
export function redirectLegacyUrl(): void {
  const next = legacyUrlToPathUrl(window.location)
  if (next !== null) {
    window.history.replaceState(window.history.state, '', next)
  }
}
