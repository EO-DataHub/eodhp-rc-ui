import { QueryCondition } from '@/json-schema-forms/rjsfTypes.ts'

/**
 * Turns an array of values into individual "in" conditions. This isn't very efficient or flexible,
 * and so it could do with being looked at again.
 * @param key The property to filter against.
 * @param values The array of values.
 * @param op How each condition is joined.
 * @returns {{op, args: *[]}}
 */
export function buildArrayFilter(key: string, values: unknown[], op: string): QueryCondition {
  const args: QueryCondition[] = values.map((value) => ({
    op: 'in',
    args: [{ property: key }, [value]],
  }))

  return {
    op,
    args,
  }
}
