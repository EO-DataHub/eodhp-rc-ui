import { QueryDispatch, QueryCondition } from '@/json-schema-forms/rjsfTypes.ts'
import { buildArrayFilter } from './queryUtils.ts'

/**
 * Build a special filter for polarizations. Because the search engine only handles the "in" operator,
 * we have to manually exclude combinations that aren't valid or that end up with a partial match.
 * @param key The property to filter against.
 * @param values A comma-separated string of values to search for.
 * @returns A QueryCondition representing the filter.
 */
function buildPolarizationsFilter(key: string, values: string): QueryCondition {
  const includedPolarizations: string[] = values.split(',')
  const excludedPolarizations: string[] = ['HH', 'VV', 'HV', 'VH']

  includedPolarizations.forEach((value) => {
    const idx = excludedPolarizations.indexOf(value)
    if (idx !== -1) {
      excludedPolarizations.splice(idx, 1)
    }
  })

  const includedFilter = buildArrayFilter(key, includedPolarizations, 'and')
  const excludedFilter = buildArrayFilter(key, excludedPolarizations, 'or')

  const args: unknown[] = [...includedFilter.args]

  args.push({
    op: 'not',
    args: [excludedFilter],
  })

  return {
    op: 'and',
    args,
  }
}

const dispatch: QueryDispatch = {
  'sar:polarizations': (_, obj) => {
    return buildPolarizationsFilter(
      'properties.sar:polarizations',
      obj['sar:polarizations'] as string,
    )
  },
}

export default dispatch
