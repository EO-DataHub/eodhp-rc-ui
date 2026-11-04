import { describe, expect, it } from 'vitest'
import { parseDateParam } from './useHubUsageSearchParams'

describe('Stage 6: parseDateParam rejects dates that do not exist', () => {
  it.each(['2026-02-30', '2026-04-31', '2025-02-29', '2026-13-01', '2026-00-10', '2026-01-00'])(
    'returns no date for %s',
    (value) => {
      expect(parseDateParam(value)).toBeUndefined()
    },
  )

  it.each(['2024-02-29', '2026-01-31', '2026-12-31'])('parses %s as midnight UTC', (value) => {
    expect(parseDateParam(value)?.toISOString()).toBe(`${value}T00:00:00.000Z`)
  })
})
