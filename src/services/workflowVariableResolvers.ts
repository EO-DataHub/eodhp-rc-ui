import type { Item, InputParameterEntry, HubType } from '@/types'
import { getSelfLinkHref } from '@/library/integrationTools'

/**
 * Context passed to variable resolvers when building workflow launch variables.
 * Used only for variable resolution; follows the same pattern as notebook integration.
 */
export interface WorkflowLaunchContext {
  item: Item
  aoi: GeoJSON.Feature | null | undefined
  includeAoi: boolean
  /** Workspace that runs the job. */
  workspace?: string
  /** Hub base URL the workflow calls EODH APIs on. */
  apiBaseUrl?: string
}

type Resolver = (ctx: WorkflowLaunchContext) => string | undefined

const resolveItemLink: Resolver = (ctx) => getSelfLinkHref(ctx.item)
const resolveAoi: Resolver = (ctx) =>
  ctx.includeAoi && ctx.aoi ? JSON.stringify(ctx.aoi) : undefined

/** Resolvers for the Hub types this dialog supports. Other Hub types fall back to variableRef. */
const HUB_TYPE_RESOLVERS: Partial<Record<HubType, Resolver>> = {
  'stac-item': resolveItemLink,
  aoi: resolveAoi,
}

/** Resolvers for platform variables, looked up by variableRef or by parameter key. */
const RESOLVERS: Record<string, Resolver> = {
  STAC_ITEM_LINK: resolveItemLink,
  STAC_COLLECTION_NAME: (ctx) => ctx.item.collection,
  AOI: resolveAoi,
  WORKSPACE_NAME: (ctx) => ctx.workspace,
  EODH_BASE_URL: (ctx) => ctx.apiBaseUrl,
}

/**
 * Finds the resolver for a parameter: by hubType first, then by variableRef, then by key name.
 */
function getResolver(paramKey: string, paramDef?: InputParameterEntry): Resolver | undefined {
  const byHubType = paramDef?.hubType && HUB_TYPE_RESOLVERS[paramDef.hubType]
  if (byHubType) return byHubType
  if (paramDef?.variableRef) return RESOLVERS[paramDef.variableRef]
  return RESOLVERS[paramKey]
}

/**
 * Returns whether a parameter has a resolver (auto-filled from context).
 * Used so the UI can compute which parameters need user input.
 *
 * @param paramKey - The parameter key
 * @param paramDef - Optional parameter definition (checked for hubType, then variableRef)
 * @returns True if the parameter is filled by the Hub
 */
export function hasResolver(paramKey: string, paramDef?: InputParameterEntry): boolean {
  return getResolver(paramKey, paramDef) !== undefined
}

/**
 * Returns the set of parameter keys that have resolvers.
 */
export function getResolvedParameterKeys(): string[] {
  return Object.keys(RESOLVERS)
}

/**
 * Builds the variables object for a workflow launch request from catalogue inputParameters and launch context.
 * Resolves each input by hubType, then variableRef, then param key.
 * Output key is always the param key.
 * Only includes keys that have a resolver and produce a non-empty string value.
 *
 * @param inputParameters - Input parameters object from workflow's inputParameters
 * @param context - Launch context containing item, AOI, includeAoi flag, workspace and API base URL
 * @returns Record of resolved variables (only keys with resolvers and non-empty values)
 */
export function buildWorkflowVariables(
  inputParameters: Record<string, InputParameterEntry>,
  context: WorkflowLaunchContext,
): Record<string, string> {
  const variables: Record<string, string> = {}

  for (const [paramKey, paramDef] of Object.entries(inputParameters)) {
    const resolver = getResolver(paramKey, paramDef)
    if (!resolver) continue

    const value = resolver(context)
    if (value != null && value !== '') {
      variables[paramKey] = value
    }
  }

  return variables
}
