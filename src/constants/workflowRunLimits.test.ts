import { describe, expect, it } from 'vitest'
import { CONFIRM_JOBS_ABOVE, MAX_JOBS_PER_RUN } from './workflowRunLimits'

describe('Stage 2: Workflow run limits config', () => {
  it('asks for confirmation above 25 jobs', () => {
    expect(CONFIRM_JOBS_ABOVE).toBe(25)
  })

  it('blocks runs above 50 jobs', () => {
    expect(MAX_JOBS_PER_RUN).toBe(50)
  })

  it('keeps the ceiling above the confirmation limit', () => {
    expect(MAX_JOBS_PER_RUN).toBeGreaterThan(CONFIRM_JOBS_ABOVE)
  })
})
