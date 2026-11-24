import type { InputParameterEntry, ProcessDetail, ProcessRecord } from '@/types'
import { getHubInputKind } from '@/services/workflowVariableResolvers'

export type WorkflowInputs = Record<string, InputParameterEntry>

/** The values of the inputs the user fills in, keyed by input name. */
export type UserValues = Record<string, string>

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const inputLabel = (key: string, def: InputParameterEntry) => def.label ?? key

const getDefaultValue = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''

/** Inputs the Hub does not fill in, so the user does. */
export const getUserInputs = (inputs: WorkflowInputs) =>
  Object.entries(inputs).filter(([key, def]) => !getHubInputKind(key, def))

export const getHubInputs = (inputs: WorkflowInputs) =>
  Object.entries(inputs).filter(([key, def]) => getHubInputKind(key, def))

export const getItemInputs = (inputs: WorkflowInputs) =>
  Object.entries(inputs).filter(([key, def]) => getHubInputKind(key, def) === 'item')

export const hasAreaInput = (inputs: WorkflowInputs) =>
  Object.entries(inputs).some(([key, def]) => getHubInputKind(key, def) === 'area')

/** True when the user has fields to fill in or an area to include. */
export const hasInputsToSet = (inputs: WorkflowInputs) =>
  getUserInputs(inputs).length > 0 || hasAreaInput(inputs)

export const isDateInput = (def: InputParameterEntry) =>
  def.hubType === 'date' || def.type === 'date'

export const isDateRangeInput = (def: InputParameterEntry) => def.hubType === 'date-range'

/** A date range is held as `start/end`, the ISO 8601 interval form. */
export const splitDateRange = (value: string): [string, string] => {
  const [start = '', end = ''] = value.split('/')
  return [start, end]
}

export const joinDateRange = (start: string, end: string) => (start || end ? `${start}/${end}` : '')

/** A range with one date set cannot be sent, so it blocks the run. */
export const isHalfFilledRange = (value: string | undefined) => {
  const [start, end] = splitDateRange(value ?? '')
  return !!start !== !!end
}

export const userValueText = (def: InputParameterEntry, value: string | undefined) => {
  if (!value) return 'Not set'
  if (isDateRangeInput(def)) {
    const [start, end] = splitDateRange(value)
    return `${start || 'Not set'} to ${end || 'Not set'}`
  }
  return value
}

export const initialUserValues = (inputs: WorkflowInputs): UserValues =>
  Object.fromEntries(getUserInputs(inputs).map(([key, def]) => [key, getDefaultValue(def.default)]))

export const toLaunchValues = (inputs: WorkflowInputs, values: UserValues) =>
  Object.fromEntries(
    getUserInputs(inputs).map(([key, def]): [string, string | number | boolean] => {
      const value = values[key] ?? ''
      if (isDateRangeInput(def)) {
        const [start, end] = splitDateRange(value)
        return [key, start && end ? joinDateRange(start, end) : '']
      }
      if (def.type === 'number') {
        const n = Number(value)
        return [key, value !== '' && !Number.isNaN(n) ? n : value]
      }
      if (def.type === 'boolean') return [key, value === 'true' || value === '1']
      return [key, value]
    }),
  )

/** List records leave out links, so they cannot be run until the full record is loaded. */
export const isFullRecord = (workflow: ProcessRecord): workflow is ProcessDetail =>
  !!(workflow as ProcessDetail).links
