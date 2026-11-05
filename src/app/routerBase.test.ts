import { describe, expect, it } from 'vitest'
import {
  hashRouteToPath,
  legacyUrlToPathUrl,
  pathnameToRoute,
  withoutKeycloakCallbackParams,
} from './routerBase'

const BASE = '/static-apps/sg-rc-ui/prod'
const url = (pathname: string, search = '', hash = '') => ({ pathname, search, hash })

describe('hashRouteToPath', () => {
  it('returns the route from a hash route', () => {
    expect(hashRouteToPath('#/my-data/saved-sets')).toBe('/my-data/saved-sets')
    expect(hashRouteToPath('#/')).toBe('/')
  })

  it('ignores fragments that are not hash routes', () => {
    expect(hashRouteToPath('')).toBeNull()
    expect(hashRouteToPath('#')).toBeNull()
    expect(hashRouteToPath('#state=abc&code=xyz')).toBeNull()
  })
})

describe('legacyUrlToPathUrl', () => {
  it('turns an old hash link into a path', () => {
    expect(legacyUrlToPathUrl(url(`${BASE}/`, '', '#/my-data/saved-sets'), BASE)).toBe(
      `${BASE}/my-data/saved-sets`,
    )
  })

  it('keeps the query inside an old permalink', () => {
    expect(
      legacyUrlToPathUrl(
        url(`${BASE}/`, '', '#/finder/sentinel-2?items=a%2Cb&bounds=1,2,3,4'),
        BASE,
      ),
    ).toBe(`${BASE}/finder/sentinel-2?items=a%2Cb&bounds=1,2,3,4`)
  })

  it('keeps a query from before the hash when the hash route has none', () => {
    expect(legacyUrlToPathUrl(url(`${BASE}/`, '?tab=x', '#/settings'), BASE)).toBe(
      `${BASE}/settings?tab=x`,
    )
  })

  it('turns the hash root into the app root', () => {
    expect(legacyUrlToPathUrl(url(`${BASE}/`, '', '#/'), BASE)).toBe(`${BASE}/`)
  })

  it('handles old hash links on index.html', () => {
    expect(legacyUrlToPathUrl(url(`${BASE}/index.html`, '', '#/finder/x'), BASE)).toBe(
      `${BASE}/finder/x`,
    )
  })

  it('turns index.html into the app root and keeps the query (Open Cosmos callback)', () => {
    expect(legacyUrlToPathUrl(url(`${BASE}/index.html`, '?code=abc&state=xyz'), BASE)).toBe(
      `${BASE}/?code=abc&state=xyz`,
    )
  })

  it('works when the app is served from the root', () => {
    expect(legacyUrlToPathUrl(url('/', '', '#/my-data'), '')).toBe('/my-data')
    expect(legacyUrlToPathUrl(url('/index.html'), '')).toBe('/')
  })

  it('leaves path URLs and other fragments alone', () => {
    expect(legacyUrlToPathUrl(url(`${BASE}/my-data/saved-sets`), BASE)).toBeNull()
    expect(legacyUrlToPathUrl(url(`${BASE}/`), BASE)).toBeNull()
    expect(legacyUrlToPathUrl(url(`${BASE}/`, '', '#'), BASE)).toBeNull()
    expect(legacyUrlToPathUrl(url(`${BASE}/`, '?state=a&code=b', '#state=a'), BASE)).toBeNull()
  })
})

describe('withoutKeycloakCallbackParams', () => {
  it('removes a login redirect query entirely', () => {
    expect(withoutKeycloakCallbackParams('?state=a&session_state=b&iss=c&code=d')).toBe('')
  })

  it("keeps the app's own params", () => {
    expect(withoutKeycloakCallbackParams('?q=sentinel&state=a&code=b&page=2')).toBe(
      '?q=sentinel&page=2',
    )
  })

  it('removes error redirects too', () => {
    expect(withoutKeycloakCallbackParams('?error=login_required&error_description=x&state=a')).toBe(
      '',
    )
  })

  it('returns null when there is nothing to remove', () => {
    expect(withoutKeycloakCallbackParams('')).toBeNull()
    expect(withoutKeycloakCallbackParams('?q=sentinel&page=2')).toBeNull()
  })
})

describe('pathnameToRoute', () => {
  it('removes the base path', () => {
    expect(pathnameToRoute(`${BASE}/my-data/saved-sets`, BASE)).toBe('/my-data/saved-sets')
  })

  it('turns the app root into "/", with or without the trailing slash', () => {
    expect(pathnameToRoute(`${BASE}/`, BASE)).toBe('/')
    expect(pathnameToRoute(BASE, BASE)).toBe('/')
  })

  it('leaves the pathname alone when the app is served from the root', () => {
    expect(pathnameToRoute('/my-data', '')).toBe('/my-data')
  })

  it('does not strip a base path that only matches part of a segment', () => {
    expect(pathnameToRoute(`${BASE}-other/x`, BASE)).toBe(`${BASE}-other/x`)
  })
})
