import type { Item } from '@/types'
import { getSelfLinkHref } from '@/library/integrationTools'

/**
 * Context passed to variable resolvers when building notebook launch variables.
 * Used only for variable resolution; extend with optional fields (e.g. startDate, endDate) for future variables.
 */
export interface NotebookLaunchContext {
  item: Item
  aoi: GeoJSON.Feature | null | undefined
  includeAoi: boolean
}

type Resolver = (ctx: NotebookLaunchContext) => string | undefined

const RESOLVERS: Record<string, Resolver> = {
  STAC_ITEM_LINK: (ctx) => getSelfLinkHref(ctx.item),
  STAC_COLLECTION_NAME: (ctx) => ctx.item.collection,
  AOI: (ctx) => (ctx.includeAoi && ctx.aoi ? JSON.stringify(ctx.aoi) : undefined),
}

/**
 * Returns whether a parameter key has a resolver (auto-filled from context).
 * Used so the UI can compute which parameters need user input for the future "unresolved variables" form.
 */
export function hasResolver(key: string): boolean {
  return key in RESOLVERS
}

/**
 * Returns the set of parameter keys that have resolvers.
 */
export function getResolvedParameterKeys(): string[] {
  return Object.keys(RESOLVERS)
}

/**
 * Builds the variables object for a notebook launch request from catalogue inputParameter keys and launch context.
 * Only includes keys that have a resolver and produce a non-empty string value.
 */
export function buildNotebookVariables(
  inputParameterKeys: string[],
  context: NotebookLaunchContext,
): Record<string, string> {
  const variables: Record<string, string> = {}
  for (const key of inputParameterKeys) {
    const resolver = RESOLVERS[key]
    if (!resolver) continue
    const value = resolver(context)
    if (value != null && value !== '') {
      variables[key] = value
    }
  }
  return variables
}
