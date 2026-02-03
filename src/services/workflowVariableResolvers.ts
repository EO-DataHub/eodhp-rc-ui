import type { Item, InputParameterEntry } from '@/types'
import { getSelfLinkHref } from '@/library/integrationTools'

/**
 * Context passed to variable resolvers when building workflow launch variables.
 * Used only for variable resolution; follows the same pattern as notebook integration.
 */
export interface WorkflowLaunchContext {
  item: Item
  aoi: GeoJSON.Feature | null | undefined
  includeAoi: boolean
}

type Resolver = (ctx: WorkflowLaunchContext) => string | undefined

const RESOLVERS: Record<string, Resolver> = {
  STAC_ITEM_LINK: (ctx) => getSelfLinkHref(ctx.item),
  STAC_COLLECTION_NAME: (ctx) => ctx.item.collection,
  AOI: (ctx) => (ctx.includeAoi && ctx.aoi ? JSON.stringify(ctx.aoi) : undefined),
}

/**
 * Returns whether a parameter key has a resolver (auto-filled from context).
 * Used so the UI can compute which parameters need user input for future "unresolved variables" form.
 *
 * @param paramKey - The parameter key
 * @param paramDef - Optional parameter definition (if provided, checks variableRef first)
 * @returns True if the parameter has a resolvable platform variable
 */
export function hasResolver(paramKey: string, paramDef?: InputParameterEntry): boolean {
  if (paramDef?.variableRef) {
    return paramDef.variableRef in RESOLVERS
  }
  return paramKey in RESOLVERS
}

/**
 * Returns the set of parameter keys that have resolvers.
 */
export function getResolvedParameterKeys(): string[] {
  return Object.keys(RESOLVERS)
}

/**
 * Builds the variables object for a workflow launch request from catalogue inputParameters and launch context.
 * Uses variableRef if present, otherwise falls back to param key.
 * Output key is always the param key, value comes from resolved platform variable.
 * Only includes keys that have a resolver and produce a non-empty string value.
 *
 * @param inputParameters - Input parameters object from workflow's inputParameters
 * @param context - Launch context containing item, AOI, and includeAoi flag
 * @returns Record of resolved variables (only keys with resolvers and non-empty values)
 */
export function buildWorkflowVariables(
  inputParameters: Record<string, InputParameterEntry>,
  context: WorkflowLaunchContext,
): Record<string, string> {
  const variables: Record<string, string> = {}

  for (const [paramKey, paramDef] of Object.entries(inputParameters)) {
    // Determine which platform variable to resolve
    // Use variableRef if present, otherwise fallback to param key
    const variableToResolve = paramDef.variableRef ?? paramKey

    // Check if this variable has a resolver
    const resolver = RESOLVERS[variableToResolve]
    if (!resolver) continue

    // Resolve the platform variable
    const value = resolver(context)

    // Only include if value is non-empty
    // Output key is always the param key (not the variableRef)
    if (value != null && value !== '') {
      variables[paramKey] = value
    }
  }

  return variables
}
