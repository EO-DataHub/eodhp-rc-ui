const API_URL = import.meta.env.VITE_HUB_BASE_URL

// Element84's Earth Search is reverse-proxied through the hub at this path rather than
// imported as an external catalog, so it needs its own hub-relative path constant.
export const ELEMENT84_CATALOG_PATH = 'public/catalogs/element84'

const ELEMENT84_CATALOG_URL = `${API_URL}/api/catalogue/stac/catalogs/${ELEMENT84_CATALOG_PATH}`

export type StacSearchMode = 'cql2' | 'query-extension' | 'auto'

export interface StacSearchStrategy {
  searchMode: StacSearchMode
}

const DEFAULT_STRATEGY: StacSearchStrategy = {
  searchMode: 'cql2',
}

const STRATEGY_BY_CATALOG: Record<string, StacSearchStrategy> = {
  // The element84 proxy is a plain reverse-proxy to earth-search.aws.element84.com,
  // which doesn't support the hub's CQL2 filtering, so it still needs query-extension.
  [ELEMENT84_CATALOG_URL]: {
    searchMode: 'query-extension',
  },
}

export const resolveStacSearchStrategy = (catalogUrl: string | null): StacSearchStrategy => {
  if (!catalogUrl) {
    return DEFAULT_STRATEGY
  }

  const normalized = catalogUrl.replace(/\/+$/, '')
  return STRATEGY_BY_CATALOG[normalized] ?? DEFAULT_STRATEGY
}
