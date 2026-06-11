interface Cql2Condition {
  op?: string
  args?: unknown[]
}

interface Cql2Filter {
  filter?: {
    op?: string
    args?: unknown[]
  }
}

interface QueryExtensionTransformResult {
  datetime?: string
  query?: Record<string, Record<string, string | number | boolean>>
  unhandledConditions: Cql2Condition[]
}

const DATE_TIME_PROPERTIES = new Set(['properties.datetime', 'datetime'])
const CLOUD_COVER_PROPERTIES = new Set(['properties.eo:cloud_cover', 'eo:cloud_cover'])

const QUERY_OPERATOR_MAP: Record<string, string> = {
  '<=': 'lte',
  '<': 'lt',
  '>=': 'gte',
  '>': 'gt',
  '=': 'eq',
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const normalizeIsoDateTimeBoundary = (value: string, boundary: 'start' | 'end'): string => {
  if (DATE_ONLY_PATTERN.test(value)) {
    return boundary === 'start' ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`
  }
  return value
}

const getConditionParts = (
  condition: Cql2Condition,
): { property: string; value: unknown } | null => {
  const args = condition.args
  if (!Array.isArray(args) || args.length < 2) return null
  const property = (args[0] as { property?: string })?.property
  return property != null ? { property, value: args[1] } : null
}

export const toQueryExtensionFilters = (
  queryFilter: object | undefined,
): QueryExtensionTransformResult => {
  const sourceFilter = queryFilter as Cql2Filter | undefined
  const rawConditions = sourceFilter?.filter?.args
  const conditions = Array.isArray(rawConditions) ? (rawConditions as Cql2Condition[]) : []

  let startDate: string | null = null
  let endDate: string | null = null
  const query: Record<string, Record<string, string | number | boolean>> = {}
  const unhandledConditions: Cql2Condition[] = []

  for (const condition of conditions) {
    const parts = getConditionParts(condition)
    const op = condition.op

    if (!parts || op == null || parts.value == null) {
      unhandledConditions.push(condition)
      continue
    }

    const { property, value } = parts

    if (DATE_TIME_PROPERTIES.has(property)) {
      if (op === '>=') {
        startDate = normalizeIsoDateTimeBoundary(String(value), 'start')
        continue
      }
      if (op === '<=') {
        endDate = normalizeIsoDateTimeBoundary(String(value), 'end')
        continue
      }
    }

    if (CLOUD_COVER_PROPERTIES.has(property)) {
      const mappedOperator = QUERY_OPERATOR_MAP[op]
      if (!mappedOperator) {
        unhandledConditions.push(condition)
        continue
      }

      query['eo:cloud_cover'] = {
        [mappedOperator]: Number(value),
      }
      continue
    }

    unhandledConditions.push(condition)
  }

  const datetime =
    startDate != null || endDate != null ? `${startDate ?? '..'}/${endDate ?? '..'}` : undefined

  const hasQuery = Object.keys(query).length > 0

  return {
    datetime,
    query: hasQuery ? query : undefined,
    unhandledConditions,
  }
}
