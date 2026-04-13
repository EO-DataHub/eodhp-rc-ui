export type StacSearchMode = 'cql2' | 'query-extension' | 'auto'

export interface StacSearchStrategy {
  searchMode: StacSearchMode
  propertyPathStyle?: 'properties-prefixed' | 'plain'
}

const DEFAULT_STRATEGY: StacSearchStrategy = {
  searchMode: 'cql2',
  propertyPathStyle: 'properties-prefixed',
}

const STRATEGY_BY_CATALOG: Record<string, StacSearchStrategy> = {
  'https://earth-search.aws.element84.com/v1': {
    searchMode: 'query-extension',
  },
}

export const resolveStacSearchStrategy = (catalogUrl: string | null): StacSearchStrategy => {
  if (!catalogUrl) {
    return DEFAULT_STRATEGY
  }

  return STRATEGY_BY_CATALOG[catalogUrl] ?? DEFAULT_STRATEGY
}
