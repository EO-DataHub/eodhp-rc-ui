import { QueryCondition, QueryDispatch } from '@/json-schema-forms/rjsfTypes.ts'
import eo from './eoQuery.ts'
import sar from './sarQuery.ts'
import sat from './satQuery.ts'
import custom from './customQuery.ts'
import view from './viewQuery.ts'
import cmip6 from './cmip6Query.ts'
import ukcp18 from './ukcp18Query.ts'
import cordex from './cordexQuery.ts'
import sentinel1 from './sentinel1Query.ts'
import planet from './planetQuery.ts'

type JSONSchema = Record<string, unknown>

interface QueryParams {
  [key: string]: QueryDispatch
}

const dispatchTable: QueryParams = {
  '': custom,
  eo: eo,
  sar: sar,
  sat: sat,
  view: view,
  cmip6: cmip6,
  ukcp: ukcp18,
  cordex: cordex,
  sentinel1: sentinel1,
  planet: planet,
}

/**
 * Constructs a full CQL2 query payload for POSTing to a STAC search engine.
 * @param schema The JSON Schema against which to validate.
 * @param formData The data returned from an RJSF form based on a valid schema.
 * @returns {object} The CQL2 query payload.
 */
export function buildQuery(schema: JSONSchema, formData: Record<string, unknown>): object {
  const flatFormData = flattenForm(formData)
  const filter = buildFilter(schema, flatFormData)

  let isPlanet = false
  if (
    schema.$id == 'https://test.eodatahub.org/schemas/planet_psscene.json' ||
    schema.$id == 'https://test.eodatahub.org/schemas/planet_reorthotile.json' ||
    schema.$id == 'https://test.eodatahub.org/schemas/planet_rescene.json' ||
    schema.$id == 'https://test.eodatahub.org/schemas/planet_skysatcollect.json' ||
    schema.$id == 'https://test.eodatahub.org/schemas/planet_skysatscene.json'
  ) {
    isPlanet = true
  }

  return {
    fields: {
      include: ['properties'],
    },
    filter,
    sortby: buildSort(isPlanet),
  }
}

/**
 * Flattens a nested form, and prefixes keys with their parent separated by a colon.
 * By prefixing it with "properties.", this neatly conforms to the format CQL2 expects.
 * @param form The form to be flattened.
 * @returns {{}}
 */
function flattenForm(form: Record<string, unknown>): Record<string, unknown> {
  // Called recursively.
  function _flatten(form: Record<string, unknown>, parentKey: string): Record<string, unknown> {
    const flattened: Record<string, unknown> = {}

    for (const key in form) {
      if (Object.hasOwn(form, key)) {
        const propName = parentKey ? `${parentKey}:${key}` : key
        // We probably want to filter out all nullish values. If we don't, modify this.
        // But when RJSF generates the form data, it caches the keys from the previous submission. If the user
        // has set a field to empty/don't care, RJSF keeps the key but sets it to undefined. Which is an arse.
        if (form[key] == null) continue

        if (typeof form[key] === 'object' && !Array.isArray(form[key])) {
          const nestedFlattened = _flatten(form[key] as Record<string, unknown>, propName)
          Object.entries(nestedFlattened).forEach(([nestedKey, value]) => {
            flattened[nestedKey] = value
          })
        } else {
          flattened[propName] = form[key]
        }
      }
    }

    return flattened
  }

  return _flatten(form, '')
}

/**
 * Creates a sort-by clause.
 * @returns {*[]}
 */
function buildSort(isPlanet: boolean): { field: string; direction: 'asc' | 'desc' }[] {
  // Super-simple hard-coded sort by date descending. In the future we'll need to make this more complex.
  return [
    {
      field: isPlanet ? 'datetime' : 'properties.end_datetime',
      direction: 'desc',
    },
  ]
}

/**
 * Builds query parameters from `dispatchTable`.
 * @param dispatch The `dispatchTable` object containing specific functions for each query type.
 * @param schema The JSON schema.
 * @param obj An object with the values entered in the form.
 * @returns A list of query conditions.
 */
function buildQueryParams(
  dispatch: QueryDispatch,
  schema: JSONSchema,
  obj: Record<string, unknown>,
): QueryCondition[] {
  const args: QueryCondition[] = []

  for (const key in obj) {
    if (key in dispatch) {
      args.push(dispatch[key](schema, obj))
    }
  }
  return args
}

/**
 * Builds the filter based on which field is being filtered on.
 * @param schema The JSON Schema against which to validate.
 * @param obj A flattened parameters object.
 * @returns {{op: string, args: *[]}}
 */
function buildFilter(schema: JSONSchema, obj: Record<string, unknown>): QueryCondition {
  const args: QueryCondition[] = []

  for (const namespace in dispatchTable) {
    args.push(...buildQueryParams(dispatchTable[namespace], schema, obj))
  }

  return {
    op: 'and',
    args,
  }
}
