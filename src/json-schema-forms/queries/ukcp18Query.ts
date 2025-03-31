import { QueryDispatch } from '@/json-schema-forms/rjsfTypes.ts'

const dispatch: QueryDispatch = {
  'ukcp18:variable_id': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.var_id' }, obj['ukcp18:variable_id']],
    }
  },
}

export default dispatch
