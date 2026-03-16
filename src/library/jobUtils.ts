import { WorkflowJob, WorkflowJobDisplayData } from '@/types'
import { formatOrderDate } from './orderUtils'

/**
 * Transforms a WorkflowJob to WorkflowJobDisplayData for table display
 * @param job - The workflow job to transform
 * @param workspace - The workspace name
 * @returns Transformed job data ready for display
 */
export const transformJobForDisplay = (
  job: WorkflowJob,
  workspace: string,
): WorkflowJobDisplayData => {
  const createdDate = new Date(job.created)
  const finishedDate = job.finished ? new Date(job.finished) : null

  return {
    id: job.id,
    processID: job.processID,
    status: job.status,
    createdDate,
    finishedDate,
    createdFormatted: formatOrderDate(job.created),
    finishedFormatted: job.finished ? formatOrderDate(job.finished) : 'N/A',
    workspace: job.workspace ?? workspace,
  }
}

/**
 * Sorts workflow jobs by created timestamp in descending order (newest first)
 * @param jobs - Array of workflow jobs to sort
 * @returns Sorted array with newest jobs first
 */
export const sortJobsByCreated = (jobs: WorkflowJob[]): WorkflowJob[] => {
  return [...jobs].sort((a, b) => {
    const dateA = new Date(a.created).getTime()
    const dateB = new Date(b.created).getTime()
    return dateB - dateA // Descending order (newest first)
  })
}
