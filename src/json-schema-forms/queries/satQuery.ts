import { QueryDispatch, QueryCondition } from '@/json-schema-forms/rjsfTypes.ts'

/**
 * Constructs a filter for satellite orbit state.
 * @param obj The object containing form input values.
 * @returns A QueryCondition for filtering orbit state.
 */
const buildOrbitStateFilter = (obj: Record<string, unknown>): QueryCondition => {
  return {
    op: 'like',
    args: [{ property: 'properties.sat:orbit_state' }, obj['sat:orbit_state']],
  }
}

const dispatch: QueryDispatch = {
  'sat:orbit_state': (_, obj) => buildOrbitStateFilter(obj),
}

export default dispatch
