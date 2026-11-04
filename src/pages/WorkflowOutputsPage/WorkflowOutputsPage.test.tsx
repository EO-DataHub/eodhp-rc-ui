import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fetchJobsForSharedWorkspace, fetchJobsForWorkspace } from '@/services/workflowJobService'
import { stubBrowserGlobals } from '@/test-data/runWorkflow'
import { workflowJob } from '@/test-data/runWorkflowFanOut'
import { withProviders } from '@/test-data/runWorkflowRender'
import { WorkflowOutputsPage } from './WorkflowOutputsPage'

vi.mock('@/services/workflowJobService', () => ({
  fetchJobsForWorkspace: vi.fn(),
  fetchJobsForSharedWorkspace: vi.fn(),
  fetchJobById: vi.fn(),
  fetchJobResults: vi.fn(),
  fetchJobLog: vi.fn(),
}))
vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(() => Promise.resolve({ access: 'ws-token' })),
  fetchWorkspaces: vi.fn(() => Promise.resolve([])),
}))

const jobs = [
  workflowJob('job-ndvi-1', 'ndvi'),
  workflowJob('job-ndvi-2', 'ndvi'),
  workflowJob('job-clip-1', 'clip'),
]

const renderPage = (url: string) =>
  render(withProviders(<WorkflowOutputsPage />, { url, path: '/my-data/workflow-outputs' }))

beforeEach(() => {
  stubBrowserGlobals()
  vi.mocked(fetchJobsForWorkspace).mockResolvedValue({ jobs, links: [], numberTotal: jobs.length })
  vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue({ jobs: [], links: [], numberTotal: 0 })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Stage 1: Workflow outputs filtered to one workflow', () => {
  it('shows only the jobs of the workflow in the workflow URL parameter', async () => {
    renderPage('/my-data/workflow-outputs?workflow=ndvi')
    expect(await screen.findByText('job-ndvi-1')).toBeInTheDocument()
    expect(screen.getByText('job-ndvi-2')).toBeInTheDocument()
    expect(screen.queryByText('job-clip-1')).toBeNull()
  })

  it('shows every job when the URL has no workflow parameter', async () => {
    renderPage('/my-data/workflow-outputs')
    expect(await screen.findByText('job-ndvi-1')).toBeInTheDocument()
    expect(screen.getByText('job-clip-1')).toBeInTheDocument()
  })
})
