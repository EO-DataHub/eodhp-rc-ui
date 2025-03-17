import { QueryDispatch } from '@/json-schema-forms/rjsfTypes.ts'

const dispatch: QueryDispatch = {
  'cmip6:frequency': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.cmip6:frequency' }, obj['cmip6:frequency']],
    }
  },
  'cmip6:variable_long_name': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.cmip6:variable_long_name' }, obj['cmip6:variable_long_name']],
    }
  },
  'cmip6:cf_standard_name': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.cmip6:cf_standard_name' }, obj['cmip6:cf_standard_name']],
    }
  },
  'cmip6:variable_id': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.cmip6:variable_id' }, obj['cmip6:variable_id']],
    }
  },
  'cmip6:source_id': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.cmip6:source_id' }, obj['cmip6:source_id']],
    }
  },
  'cmip6:source_type': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.cmip6:source_type' }, obj['cmip6:source_type']],
    }
  },
  'cmip6:experiment_id': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.cmip6:experiment_id' }, obj['cmip6:experiment_id']],
    }
  },
  'cmip6:variant_label': (_, obj) => {
    return {
      op: '=',
      args: [{ property: 'properties.cmip6:variant_label' }, obj['cmip6:variant_label']],
    }
  },
}

export default dispatch
