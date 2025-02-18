import { QueryDispatch, QueryCondition, JSONSchema } from '@/json-schema-forms/rjsfTypes.ts'

/**
 * Builds a query condition for a given property in the "view" namespace.
 * @param schema The JSON Schema for validation.
 * @param obj The object containing form input values.
 * @param key The key representing the view property.
 * @returns A QueryCondition for filtering.
 */
const buildViewFilter = (
  schema: JSONSchema,
  obj: Record<string, unknown>,
  key: string,
): QueryCondition => {
  return {
    op: schema.properties?.[key]?.operator ?? '<=',
    args: [{ property: `properties.${key}` }, obj[key]],
  }
}

const dispatch: QueryDispatch = {
  'view:incidence_angle': (schema, obj) => buildViewFilter(schema, obj, 'view:incidence_angle'),
  'view:sun_azimuth': (schema, obj) => buildViewFilter(schema, obj, 'view:sun_azimuth'),
  'view:sun_elevation': (schema, obj) => buildViewFilter(schema, obj, 'view:sun_elevation'),
  'view:azimuth': (schema, obj) => buildViewFilter(schema, obj, 'view:azimuth'),
}

export default dispatch
