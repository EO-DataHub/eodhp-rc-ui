export type RangeLimit = 'min' | 'max'

// Matches the query builders: a '>' operator keeps values at or above the slider value
export const getRangeLimit = (operator: string | undefined): RangeLimit | null => {
  if (operator?.includes('>')) return 'min'
  if (operator?.includes('<')) return 'max'
  return null
}

// The slider value is a limit, not an exact match, so say which kind in the label
export const getRangeLabel = (title: string | undefined, limit: RangeLimit | null): string => {
  if (!title) return 'Select a range value'
  if (!limit) return title
  const prefix = limit === 'min' ? 'Minimum' : 'Maximum'
  // Leave acronyms like "SAR" alone; only lowercase a sentence-case first word
  const isAcronym = /^[A-Z]{2}/.test(title)
  return `${prefix} ${isAcronym ? title : title[0].toLowerCase() + title.slice(1)}`
}
