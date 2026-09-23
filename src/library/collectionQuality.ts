import type { Collection } from '@/types'

/** True when the collection exposes QA assets, used for the QA badge and gallery filter. */
export function collectionHasQAIndicators(collection: Collection): boolean {
  return (
    collection.assets?.qa_documentation?.href != null ||
    collection.assets?.qa_radiometric?.href != null
  )
}

/** The QA tab to open first: documentation when available, otherwise validation. */
export function getDefaultQATab(collection: Collection): 'qa_documentation' | 'qa_validation' {
  return collection.assets?.qa_documentation?.href != null ? 'qa_documentation' : 'qa_validation'
}

interface QALink {
  rel?: string
  href: string
  title?: string
}

/**
 * Find a QA link by the last segment of its `rel`, e.g. `data_product_report` matches
 * `https://eodatahub.org.uk/api/ontologies/qa/data_product_report`. Hyphens and
 * underscores are treated the same.
 */
export function findQALinkByRel<T extends QALink>(links: T[] | undefined, relName: string) {
  const normalise = (value: string) => value.replace(/-/g, '_').toLowerCase()
  const target = normalise(relName)
  return links?.find((link) => {
    const lastSegment = link.rel?.split('/').pop()
    return lastSegment != null && normalise(lastSegment) === target
  })
}

/**
 * Split the QPR `information` text into a readable label and the first URL it contains,
 * e.g. "Result criteria follows X, found at: https://..." -> { label: "Result criteria follows X", href }.
 */
export function parseFrameworkReference(
  information: string | undefined,
): { label: string; href: string } | null {
  const match = information?.match(/https?:\/\/\S+/)
  if (!information || match?.index == null) return null
  const label = information
    .slice(0, match.index)
    .replace(/[\s,:]*(?:\b(?:found at|see|at))?[\s,:]*$/i, '')
    .trim()
  return { label: label || 'Assessment framework', href: match[0] }
}

export interface RadiometricWindow {
  key: string
  year: number
  /** 1-12 */
  month: number
}

/**
 * Parse radiometric window keys (`YYYY-MM-DD,YYYY-MM-DD`) into their start year and month.
 * Keys that cannot be parsed are dropped.
 */
export function parseRadiometricWindows(keys: string[]): RadiometricWindow[] {
  return keys.flatMap((key) => {
    const match = key.trim().match(/^(\d{4})-(\d{2})-\d{2}/)
    if (!match) return []
    return [{ key, year: Number(match[1]), month: Number(match[2]) }]
  })
}

/** Group windows by year, then month. Years are sorted ascending. */
export function groupRadiometricWindowsByYear(windows: RadiometricWindow[]) {
  const byYear = new Map<number, Map<number, string>>()
  for (const window of windows) {
    const months = byYear.get(window.year) ?? new Map<number, string>()
    // Keep the first window seen for a month; the data only has one per month
    if (!months.has(window.month)) months.set(window.month, window.key)
    byYear.set(window.year, months)
  }
  const years = [...byYear.keys()].sort((a, b) => a - b)
  return { years, byYear }
}
