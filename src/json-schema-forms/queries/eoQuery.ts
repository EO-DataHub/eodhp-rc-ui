import { QueryDispatch } from '@/json-schema-forms/rjsfTypes'

const dispatch: QueryDispatch = {
  'eo:cloud_cover': (schema, obj) => {
    return {
      op: schema.properties?.['eo:cloud_cover']?.operator ?? '<=',
      args: [{ property: 'properties.eo:cloud_cover' }, obj['eo:cloud_cover'] ?? null],
    }
  },
  'eo:snow_cover': (schema, obj) => {
    return {
      op: schema.properties?.['eo:snow_cover']?.operator ?? '<=',
      args: [{ property: 'properties.eo:snow_cover' }, obj['eo:snow_cover'] ?? null],
    }
  },
}

export default dispatch
