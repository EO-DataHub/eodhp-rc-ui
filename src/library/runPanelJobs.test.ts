import { describe, expect, it } from 'vitest'
import { listedJob } from '@/test-data/runPanel'
import { countStartedJobs, shouldRefreshJobs } from './runPanelJobs'

const jobs = [
  listedJob('job-1', 'ndvi', 'running'),
  listedJob('job-2', 'ndvi', 'successful'),
  listedJob('job-3', 'ndvi', 'successful'),
  listedJob('job-4', 'ndvi', 'failed'),
  listedJob('colleague-1', 'ndvi', 'running'),
]

describe('Badge job counts', () => {
  it('counts only the jobs started in this visit, by status', () => {
    expect(countStartedJobs(jobs, ['job-1', 'job-2', 'job-3', 'job-4'])).toEqual({
      running: 1,
      finished: 2,
      failed: 1,
    })
  })

  it('counts a started job that is not in the list yet as running', () => {
    expect(countStartedJobs(jobs, ['job-2', 'job-new'])).toEqual({
      running: 1,
      finished: 1,
      failed: 0,
    })
  })
})

describe('When the job list refreshes', () => {
  it('refreshes while a job started in this visit is running or not listed yet', () => {
    expect(shouldRefreshJobs(jobs, ['job-1', 'job-2'])).toBe(true)
    expect(shouldRefreshJobs(jobs, ['job-2', 'job-new'])).toBe(true)
  })

  it('stops when every job started in this visit has finished or failed', () => {
    expect(shouldRefreshJobs(jobs, ['job-2', 'job-3', 'job-4'])).toBe(false)
  })

  it('does not refresh for running jobs from outside this visit', () => {
    expect(shouldRefreshJobs(jobs, [])).toBe(false)
  })
})
