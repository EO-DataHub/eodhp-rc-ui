import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { fetchCalledJobs, fetchJobById, fetchJobsForWorkspace } from '@/services/workflowJobService'
import { stubBrowserGlobals } from '@/test-data/runWorkflow'
import { workflowJob } from '@/test-data/runWorkflowFanOut'
import { withProviders } from '@/test-data/runWorkflowRender'
import { WorkflowOutputsPage } from './WorkflowOutputsPage'

vi.mock('@/services/workflowJobService', async (importOriginal) => ({
  // Keep the paging helpers (page size, next-link readers); mock only the requests
  ...(await importOriginal<typeof import('@/services/workflowJobService')>()),
  fetchJobsForWorkspace: vi.fn(),
  fetchCalledJobs: vi.fn(),
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

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

/** Renders the page on the route that takes a job, with the address shown for checks */
const renderJobRoute = (url: string) =>
  render(
    withProviders(
      <>
        <WorkflowOutputsPage />
        <LocationProbe />
      </>,
      { url, path: '/my-data/workflow-outputs/:workspace?/:jobId?' },
    ),
  )

/** A job this workspace started on a workflow published in the `publisher` workspace */
const calledJob = {
  ...workflowJob('job-called-1', 'ndvi'),
  links: [
    {
      rel: 'self',
      href: 'https://hub.example/api/catalogue/stac/catalogs/user/catalogs/publisher/jobs/job-called-1',
      type: 'application/json',
    },
  ],
}

beforeEach(() => {
  stubBrowserGlobals()
  vi.mocked(fetchJobsForWorkspace).mockResolvedValue({ jobs, links: [], numberTotal: jobs.length })
  vi.mocked(fetchCalledJobs).mockResolvedValue({ jobs: [], links: [], numberTotal: 0 })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Workflow outputs filtered to one workflow', () => {
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

describe('Workflow outputs job address', () => {
  it('puts the workspace a called job ran in into the address when its row is clicked', async () => {
    vi.mocked(fetchCalledJobs).mockResolvedValue({ jobs: [calledJob], links: [], numberTotal: 1 })
    renderJobRoute('/my-data/workflow-outputs/test-workspace')
    await userEvent.click(await screen.findByText('job-called-1'))
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/my-data/workflow-outputs/test-workspace/job-called-1?jobWorkspace=publisher',
    )
  })

  it("leaves the job's workspace out of the address when it is the listed workspace", async () => {
    renderJobRoute('/my-data/workflow-outputs/test-workspace')
    await userEvent.click(await screen.findByText('job-ndvi-1'))
    expect(screen.getByTestId('location').textContent).toBe(
      '/my-data/workflow-outputs/test-workspace/job-ndvi-1',
    )
  })

  it('fetches a job that is not loaded from the workspace the address names', async () => {
    vi.mocked(fetchJobById).mockResolvedValue(calledJob)
    renderJobRoute('/my-data/workflow-outputs/test-workspace/job-called-1?jobWorkspace=publisher')
    await vi.waitFor(() =>
      expect(fetchJobById).toHaveBeenCalledWith('publisher', 'job-called-1', 'ws-token'),
    )
    expect(fetchJobById).toHaveBeenCalledTimes(1)
  })
})
