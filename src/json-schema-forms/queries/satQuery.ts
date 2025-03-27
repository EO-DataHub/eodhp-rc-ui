import { QueryDispatch } from '@/json-schema-forms/rjsfTypes.ts'

const dispatch: QueryDispatch = {
  'sat:orbit_state': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.sat:orbit_state' }, obj['sat:orbit_state']],
    }
  },
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
