import type { WorkflowInput } from './demoTypes'

export type UserValues = Record<string, string | number | boolean>

export interface HubValue {
  text: string
  /** A required value the Hub can't fill, e.g. no area drawn. */
  missing?: boolean
}

export const initialUserValues = (inputs: WorkflowInput[]): UserValues =>
  Object.fromEntries(
    inputs
      .filter((i) => i.source.kind === 'user')
      .map((i) => [i.id, i.default ?? (i.cwlType === 'boolean' ? false : '')]),
  )
