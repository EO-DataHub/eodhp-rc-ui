export interface JSONSchema {
  properties?: Record<string, { operator?: string }>
}

export interface QueryCondition {
  op: string
  args: unknown[]
}

export interface QueryDispatch {
  [key: string]: (schema: JSONSchema, obj: Record<string, unknown>) => QueryCondition
}
