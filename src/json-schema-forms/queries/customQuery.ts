import { QueryDispatch } from '@/json-schema-forms/rjsfTypes.ts'

const dispatch: QueryDispatch = {
  start_datetime: (_, obj) => {
    return {
      op: '>=',
      args: [
        { property: 'properties.datetime' },
        obj['start_datetime'], // eslint-disable-line @typescript-eslint/dot-notation
      ],
    }
  },
  end_datetime: (_, obj) => {
    return {
      op: '<=',
      args: [
        { property: 'properties.datetime' },
        obj['end_datetime'], // eslint-disable-line @typescript-eslint/dot-notation
      ],
    }
  },
  incidence_angle: (schema, obj) => {
    // Used in Airbus SAR data
    return {
      op: schema.properties?.['incidence_angle']?.operator ?? '>=', // eslint-disable-line @typescript-eslint/dot-notation
      args: [
        { property: 'properties.incidence_angle.minimum' },
        obj['incidence_angle'], // eslint-disable-line @typescript-eslint/dot-notation
      ],
    }
  },
  clear_percent: (schema, obj) => {
    // Used in Planet data
    return {
      op: schema.properties?.['clear_percent']?.operator ?? '>=', // eslint-disable-line @typescript-eslint/dot-notation
      args: [
        { property: 'clear_percent' },
        obj['clear_percent'], // eslint-disable-line @typescript-eslint/dot-notation
      ],
    }
  },
}

export default dispatch
