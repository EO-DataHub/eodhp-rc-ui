export const ELEMENT84_EARTH_SEARCH_URL = 'https://earth-search.aws.element84.com/v1'

export type StacSearchMode = 'cql2' | 'query-extension' | 'auto'

export interface StacSearchStrategy {
  searchMode: StacSearchMode
}

const DEFAULT_STRATEGY: StacSearchStrategy = {
  searchMode: 'cql2',
}

const STRATEGY_BY_CATALOG: Record<string, StacSearchStrategy> = {
  [ELEMENT84_EARTH_SEARCH_URL]: {
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
