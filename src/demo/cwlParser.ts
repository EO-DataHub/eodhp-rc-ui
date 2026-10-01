import { parse } from 'yaml'

export interface ParsedCwlInput {
  id: string
  cwlType: string
  optional: boolean
  label?: string
  doc?: string
  default?: string | number | boolean
  choices?: string[]
}

export interface CwlCheck {
  level: 'ok' | 'warning' | 'error'
  message: string
}

export interface ParsedCwl {
  id?: string
  label?: string
  doc?: string
  inputs: ParsedCwlInput[]
  checks: CwlCheck[]
}

type CwlObject = Record<string, unknown>

const isObject = (value: unknown): value is CwlObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Packed CWL uses ids like `#main/index/NDVI`; keep the last part. */
const shortName = (value: string) => value.split(/[#/]/).filter(Boolean).pop() ?? value

const normaliseType = (
  type: unknown,
): { cwlType: string; optional: boolean; choices?: string[] } => {
  if (typeof type === 'string') {
    const optional = type.endsWith('?')
    return { cwlType: type.replace(/\?$/, ''), optional }
  }
  if (Array.isArray(type)) {
    // Unions like ['null', 'string'] mean an optional input.
    const rest = type.filter((t) => t !== 'null')
    const inner = normaliseType(rest.length === 1 ? rest[0] : 'string')
    return { ...inner, optional: type.includes('null') || inner.optional }
  }
  if (isObject(type)) {
    if (type.type === 'array') {
      const items = normaliseType(type.items)
      return { cwlType: `${items.cwlType}[]`, optional: false }
    }
    if (type.type === 'enum' && Array.isArray(type.symbols)) {
      return {
        cwlType: 'enum',
        optional: false,
        choices: type.symbols.map((s) => shortName(String(s))),
      }
    }
  }
  return { cwlType: 'unknown', optional: false }
}

const toInputs = (rawInputs: unknown): ParsedCwlInput[] => {
  const entries: [string, unknown][] = Array.isArray(rawInputs)
    ? rawInputs
        .filter(isObject)
        .map((input) => [shortName(String(input.id ?? '')), input] as [string, unknown])
    : isObject(rawInputs)
      ? Object.entries(rawInputs)
      : []

  return entries.map(([id, definition]) => {
    const spec = isObject(definition) ? definition : { type: definition }
    const { cwlType, optional, choices } = normaliseType(spec.type)
    const defaultValue = spec.default
    return {
      id: shortName(id),
      cwlType,
      optional: optional || defaultValue !== undefined,
      label: typeof spec.label === 'string' ? spec.label : undefined,
      doc: typeof spec.doc === 'string' ? spec.doc : undefined,
      default:
        typeof defaultValue === 'string' ||
        typeof defaultValue === 'number' ||
        typeof defaultValue === 'boolean'
          ? defaultValue
          : undefined,
      choices,
    }
  })
}

/** Pick the process users launch: the top-level Workflow in a packed `$graph`, or the document. */
const pickMainProcess = (doc: CwlObject): CwlObject | undefined => {
  if (!Array.isArray(doc.$graph)) return doc
  const graph = doc.$graph.filter(isObject)
  return (
    graph.find((p) => p.class === 'Workflow' && shortName(String(p.id ?? '')) === 'main') ??
    graph.find((p) => p.class === 'Workflow') ??
    graph[0]
  )
}

export const parseCwl = (text: string): ParsedCwl => {
  let doc: unknown
  try {
    doc = parse(text)
  } catch (error) {
    return {
      inputs: [],
      checks: [
        {
          level: 'error',
          message: `This file isn't valid YAML or JSON: ${error instanceof Error ? error.message : 'unknown error'}`,
        },
      ],
    }
  }

  if (!isObject(doc) || typeof doc.cwlVersion !== 'string') {
    return {
      inputs: [],
      checks: [{ level: 'error', message: "This doesn't look like a CWL file (no cwlVersion)." }],
    }
  }

  const main = pickMainProcess(doc)
  const checks: CwlCheck[] = [{ level: 'ok', message: `Valid CWL (${doc.cwlVersion})` }]
  const inputs = main ? toInputs(main.inputs) : []

  if (inputs.length === 0) {
    checks.push({ level: 'error', message: 'Your workflow has no inputs.' })
  } else {
    checks.push({ level: 'ok', message: `Found ${inputs.length} inputs` })
  }

  const unsupported = inputs.filter((i) => i.cwlType === 'unknown' || i.cwlType.startsWith('File'))
  unsupported.forEach((input) =>
    checks.push({
      level: 'error',
      message: `Input "${input.id}" has type ${input.cwlType}, which isn't supported yet.`,
    }),
  )

  return {
    id: main && typeof main.id === 'string' ? shortName(main.id) : undefined,
    label: main && typeof main.label === 'string' ? main.label : undefined,
    doc: main && typeof main.doc === 'string' ? main.doc : undefined,
    inputs,
    checks,
  }
}
