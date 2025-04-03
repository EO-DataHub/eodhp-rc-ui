import { QueryDispatch } from '@/json-schema-forms/rjsfTypes.ts'

const dispatch: QueryDispatch = {
  'planet:start_datetime': (_, obj) => {
    return {
      op: '>=',
      args: [{ property: 'datetime' }, (obj['planet:start_datetime'] as string) + 'T00:00:00.000Z'],
    }
  },
  'planet:end_datetime': (_, obj) => {
    return {
      op: '<=',
      args: [{ property: 'datetime' }, (obj['planet:end_datetime'] as string) + 'T23:59:59.999Z'],
    }
  },
  'planet:cloud_percent': (schema, obj) => {
    return {
      op: schema.properties?.['planet:cloud_percent']?.operator ?? '<=',
      args: [{ property: 'cloud_percent' }, obj['planet:cloud_percent'] ?? null],
    }
  },
  'planet:clear_percent': (schema, obj) => {
    return {
      op: schema.properties?.['clear_percent']?.operator ?? '>=', // eslint-disable-line @typescript-eslint/dot-notation
      args: [{ property: 'clear_percent' }, obj['planet:clear_percent']],
    }
  },
}

export default dispatch
