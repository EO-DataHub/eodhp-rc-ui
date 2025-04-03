import { QueryDispatch } from '@/json-schema-forms/rjsfTypes.ts'
import { buildPolarizationsFilter } from '@/json-schema-forms/queries/sarQuery.ts'

const dispatch: QueryDispatch = {
  'sentinel1:Orbit Direction': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.Orbit Direction' }, obj['sentinel1:Orbit Direction']],
    }
  },
  'sentinel1:platform': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.platform' }, obj['sentinel1:platform']],
    }
  },
  'sentinel1:instrument_mode': (_, obj) => {
    return {
      op: 'like',
      args: [{ property: 'properties.instrument_mode' }, obj['sentinel1:instrument_mode']],
    }
  },
  'sentinel1:Polarisation': (_, obj) => {
    return buildPolarizationsFilter(
      'properties.Polarisation',
      obj['sentinel1:Polarisation'] as string,
    )
  },
}

export default dispatch
