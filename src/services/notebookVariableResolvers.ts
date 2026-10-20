import type { Item, ProcessRecord } from '@/types'
import { getSelfLinkHref } from '@/library/integrationTools'

/** The saved set a notebook is launched for. */
export interface PinSetLaunchContext {
  id: string
  name: string
}

/**
 * Context passed to variable resolvers when building notebook launch variables.
 * A launch is for either a single item (with an optional AOI) or a saved set.
 * Used only for variable resolution; extend with optional fields (e.g. startDate, endDate) for future variables.
 */
export interface NotebookLaunchContext {
  /** Workspace the notebook works in; for a set, the set's workspace. */
  workspace?: string
  /** Hub base URL the notebook calls EODH APIs on. */
  apiBaseUrl?: string
  item?: Item
  aoi?: GeoJSON.Feature | null
  includeAoi?: boolean
  pinSet?: PinSetLaunchContext
}

type Resolver = (ctx: NotebookLaunchContext) => string | undefined

const RESOLVERS: Record<string, Resolver> = {
  STAC_ITEM_LINK: (ctx) => (ctx.item ? getSelfLinkHref(ctx.item) : undefined),
  STAC_COLLECTION_NAME: (ctx) => ctx.item?.collection,
  AOI: (ctx) => (ctx.includeAoi && ctx.aoi ? JSON.stringify(ctx.aoi) : undefined),
  PIN_SET_ID: (ctx) => ctx.pinSet?.id,
  PIN_SET_NAME: (ctx) => ctx.pinSet?.name,
  WORKSPACE_NAME: (ctx) => ctx.workspace,
  EODH_BASE_URL: (ctx) => ctx.apiBaseUrl,
}

/** Resolved parameters a notebook can run without. */
const OPTIONAL_KEYS = new Set(['AOI'])

/** Notebooks that declare this parameter work on a saved set rather than a single item. */
export const PIN_SET_PARAMETER = 'PIN_SET_ID'

export function isPinSetNotebook(record: ProcessRecord): boolean {
  return PIN_SET_PARAMETER in (record.properties?.inputParameters ?? {})
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

/**
 * Returns the required keys the context couldn't fill, e.g. STAC_ITEM_LINK when launching for a set.
 * Keys without a resolver are ignored; they're left for the user to fill in the notebook.
 */
export function getMissingVariables(
  inputParameterKeys: string[],
  variables: Record<string, string>,
): string[] {
  return inputParameterKeys.filter(
    (key) => hasResolver(key) && !OPTIONAL_KEYS.has(key) && !(key in variables),
  )
}
