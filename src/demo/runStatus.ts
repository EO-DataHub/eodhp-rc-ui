import { useEffect, useState } from 'react'
import type { RunBatch, RunJob } from './demoTypes'

export type JobStatus = 'queued' | 'running' | 'successful' | 'failed'

/** Jobs start a few seconds apart, like a real queue. */
const QUEUE_GAP_MS = 4000

export const jobStatus = (run: RunBatch, job: RunJob, index: number, now: number): JobStatus => {
  const start = (job.retriedAt ?? run.startedAt) + (job.retriedAt ? 0 : index * QUEUE_GAP_MS)
  if (now < start) return 'queued'
  if (now < start + job.durationMs) return 'running'
  return job.fails ? 'failed' : 'successful'
}

export const runSummary = (run: RunBatch, now: number) => {
  const statuses = run.jobs.map((job, index) => jobStatus(run, job, index, now))
  const count = (status: JobStatus) => statuses.filter((s) => s === status).length
  const done = count('successful') + count('failed')
  const isFinished = done === run.jobs.length
  return {
    statuses,
    successful: count('successful'),
    failed: count('failed'),
    running: count('running'),
    queued: count('queued'),
    done,
    isFinished,
    progress: Math.round((done / run.jobs.length) * 100),
  }
}

/** Re-renders every `intervalMs` so simulated progress moves. */
export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
