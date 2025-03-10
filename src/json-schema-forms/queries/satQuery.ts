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
  'sat:platform_international_designator': (_, obj) => {
    return {
      op: 'like',
      args: [
        { property: 'properties.sat:platform_international_designator' },
        obj['sat:platform_international_designator'],
      ],
    }
  },
}

export default dispatch
