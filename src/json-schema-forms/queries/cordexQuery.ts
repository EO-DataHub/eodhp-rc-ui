import { QueryDispatch } from '@/json-schema-forms/rjsfTypes.ts'

const dispatch: QueryDispatch = {
  'cordex:frequency': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.time_frequency' }, obj['cordex:frequency']],
    }
  },
  'cordex:variable_long_name': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.variable_long_name' }, obj['cordex:variable_long_name']],
    }
  },
  'cordex:cf_standard_name': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.cf_standard_name' }, obj['cordex:cf_standard_name']],
    }
  },
  'cordex:variable_id': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.variable_id' }, obj['cordex:variable_id']],
    }
  },
}

export default dispatch
