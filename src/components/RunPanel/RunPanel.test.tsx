import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import type { Collection, Item, ProcessDetail } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems as fetchCatalogue } from '@/services/processCatalogueService'
import { fetchItems as searchItems } from '@/services/itemService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchSavedSet, fetchSavedSets } from '@/services/savedSetsService'
import { fetchJobsForSharedWorkspace, fetchJobsForWorkspace } from '@/services/workflowJobService'
import { useNotebookLaunch } from '@/hooks/useNotebookLaunch'
import { PAGE_SIZE } from '@/hooks/useItemsQuery'
import {
  aoi,
  anyDatasetWorkflow,
  fetchToolsFromFixtures,
  itemNotebook,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import {
  clearPins,
  fanOutItem,
  fanOutItemHref,
  fanOutItems,
  pinItems,
  savedSet,
  sentinelCollection,
  sentItemLinks,
  setItem,
  stubPointerApis,
  summaryOf,
  workspaceCollection,
} from '@/test-data/runWorkflowFanOut'
import {
  chooseTool,
  fetchAnyToolById,
  hideRunPanel,
  jobLinks,
  jobsResponse,
  listedJob,
  openRunPanel,
  queryRunPanel,
  renderWithRunPanel,
  runPanel,
  runWorkflowButton,
  sourceRadio,
} from '@/test-data/runPanel'

// Small limits, so the tests need few items and show the panel reads them from the config module
const limits = vi.hoisted(() => ({ CONFIRM_JOBS_ABOVE: 12, MAX_JOBS_PER_RUN: 20 }))
vi.mock('@/constants/workflowRunLimits', () => limits)
const { CONFIRM_JOBS_ABOVE, MAX_JOBS_PER_RUN } = limits

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(),
  fetchWorkspaces: vi.fn(),
}))
vi.mock('@/services/itemService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/itemService')>()),
  fetchItems: vi.fn(),
}))
vi.mock('@/services/savedSetsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/savedSetsService')>()),
  fetchSavedSets: vi.fn(),
  fetchSavedSet: vi.fn(),
}))
vi.mock('@/services/workflowJobService', () => ({
  fetchJobsForWorkspace: vi.fn(),
  fetchJobsForSharedWorkspace: vi.fn(),
  fetchJobById: vi.fn(),
  fetchJobResults: vi.fn(),
  fetchJobLog: vi.fn(),
}))
vi.mock('@/hooks/useNotebookLaunch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useNotebookLaunch')>()),
  useNotebookLaunch: vi.fn(),
}))

type User = ReturnType<typeof userEvent.setup>

const landsat = {
  id: 'landsat_c2l2',
  title: 'Landsat C2 L2',
  description: '',
  links: [],
  extent: {},
} as unknown as Collection

const results = fanOutItems(PAGE_SIZE + 1, 'S2A_RESULT')
const set = savedSet([setItem('S2A_SET_1'), setItem('S2A_SET_2'), setItem('S2A_SET_3')])
const launchNotebook = vi.fn()

/** The list entry for a tool, found by its exact title. */
const toolEntry = async (panel: HTMLElement, title: string) => {
  const titleText = await within(panel).findByText(title, { exact: true })
  const entry = titleText.closest('button, a, [role="button"]')
  expect(entry).not.toBeNull()
  return entry as HTMLElement
}

const isBefore = (first: HTMLElement, second: HTMLElement) =>
  !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

const otherCollectionsHeading = (panel: HTMLElement) =>
  within(panel).findByRole('heading', { name: /^tools for other collections$/i })

/** The smallest element whose whole text matches. */
const textElement = (container: HTMLElement, pattern: RegExp) =>
  within(container).getAllByText(
    (_, element) =>
      !!element &&
      pattern.test(element.textContent ?? '') &&
      Array.from(element.children).every((child) => !pattern.test(child.textContent ?? '')),
  )[0]

/** The review line with the job count and the items' dates. */
const reviewLine = (panel: HTMLElement) => textElement(panel, /\bjobs?\b.*·/i)

const hideButton = (panel: HTMLElement) =>
  within(panel).getByRole('button', { name: /^(hide|close)/i })

/** Chooses a workflow, opens the panel on a source and waits for the form. */
const openForm = async (
  source: 'item' | 'pinned' | 'set' | 'results',
  { tool = ndviWorkflow, item }: { tool?: ProcessDetail; item?: Item } = {},
  queryClient?: QueryClient,
) => {
  chooseTool(tool)
  openRunPanel({ source, item })
  await renderWithRunPanel(null, { queryClient })
  const panel = await runPanel()
  await within(panel).findByRole('button', { name: 'Run workflow' })
  return panel
}

const runAndWait = async (user: User, panel: HTMLElement) => {
  await user.click(runWorkflowButton(panel))
  return within(panel).findByText(/\bjobs? started\b/i)
}

const outputsTab = (panel: HTMLElement) =>
  within(panel).getByRole('tab', { name: 'Workflow outputs' })

const toolsTab = (panel: HTMLElement) => within(panel).getByRole('tab', { name: 'Tools' })

/** The job IDs the panel links to, in the order they appear. */
const jobIds = (panel: HTMLElement) => jobLinks(panel).map((href) => href.split('/').pop())

const sharedListCalls = () => vi.mocked(fetchJobsForSharedWorkspace).mock.calls.length
const userListCalls = () => vi.mocked(fetchJobsForWorkspace).mock.calls.length

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  stubPointerApis()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  hideRunPanel()
  clearPins()
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'storeAoi', aoi: undefined })
  dataFinderStore.send({ type: 'setCollection', collection: sentinelCollection })
  dataFinderStore.send({ type: 'queryFilterChange', queryFilter: { limit: 100 } })

  vi.mocked(fetchCatalogue).mockImplementation(fetchToolsFromFixtures)
  vi.mocked(fetchItemById).mockImplementation(fetchAnyToolById)
  vi.mocked(searchItems).mockResolvedValue(results)
  vi.mocked(fetchSavedSets).mockResolvedValue([summaryOf(set)])
  vi.mocked(fetchSavedSet).mockResolvedValue(set)
  vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as never)
  vi.mocked(fetchJobsForWorkspace).mockResolvedValue(jobsResponse([]))
  vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(jobsResponse([]))
  let jobNumber = 0
  vi.mocked(launchWorkflow).mockImplementation(() => {
    jobNumber += 1
    return Promise.resolve({
      workflowId: `job-${jobNumber}`,
      status: 'accepted',
      submittedAt: '2026-11-02T10:00:00Z',
    })
  })
  vi.mocked(useNotebookLaunch).mockImplementation((params) => ({
    notebooks: [],
    selectedNotebook: params.notebook ?? null,
    setSelectedNotebook: vi.fn(),
    launch: launchNotebook,
    isLoadingNotebooks: false,
    isLaunching: false,
    notebooksError: null,
    launchError: null,
    retry: vi.fn(),
  }))
})

afterEach(() => {
  hideRunPanel()
  clearPins()
  dataFinderStore.send({ type: 'clearTool' })
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Run panel and tool list', () => {
  it('opens from the Tools button as a landmark, and × hides it again', async () => {
    const user = userEvent.setup()
    await renderWithRunPanel()
    expect(queryRunPanel()).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Tools' }))
    const panel = await runPanel()
    expect(panel.tagName).toBe('ASIDE')
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(hideButton(panel))
    expect(queryRunPanel()).toBeNull()
    expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument()
  })

  it('lists the tools for the open dataset, then Tools for other collections, without set notebooks', async () => {
    openRunPanel()
    await renderWithRunPanel()
    const panel = await runPanel()

    const title = await within(panel).findByRole('heading', { name: 'Tools for Sentinel-2 ARD' })
    const other = await otherCollectionsHeading(panel)
    for (const name of ['NDVI', 'Clip', 'Footprint', 'Area mask', 'Change detection']) {
      const entry = await toolEntry(panel, name)
      expect(isBefore(title, entry) && isBefore(entry, other)).toBe(true)
    }
    const notebook = await toolEntry(panel, 'NDVI notebook')
    expect(isBefore(notebook, other)).toBe(true)
    expect(isBefore(other, await toolEntry(panel, 'Landsat surface temperature'))).toBe(true)
    expect(within(panel).queryByText('Set statistics')).toBeNull()

    const workflow = await toolEntry(panel, 'NDVI')
    expect(workflow).toHaveTextContent(/workflow/i)
    expect(workflow).toHaveTextContent('Calculates NDVI for one Sentinel-2 item.')
    expect(notebook).toHaveTextContent(/notebook/i)
    expect(notebook).toHaveTextContent('Explore NDVI for one item in Jupyter.')
  })

  it('changes the list and its title when the dataset changes', async () => {
    openRunPanel()
    await renderWithRunPanel()
    const panel = await runPanel()
    await within(panel).findByRole('heading', { name: 'Tools for Sentinel-2 ARD' })

    act(() => {
      dataFinderStore.send({ type: 'setCollection', collection: landsat })
    })

    expect(
      await within(panel).findByRole('heading', { name: 'Tools for Landsat C2 L2' }),
    ).toBeInTheDocument()
    const other = await otherCollectionsHeading(panel)
    expect(isBefore(await toolEntry(panel, 'Landsat surface temperature'), other)).toBe(true)
    expect(isBefore(other, await toolEntry(panel, 'NDVI'))).toBe(true)
  })

  it('chooses a tool from the list, and Clear tool shows the list again', async () => {
    const user = userEvent.setup()
    openRunPanel()
    await renderWithRunPanel()
    const panel = await runPanel()

    await user.click(await toolEntry(panel, 'NDVI'))
    expect(dataFinderStore.getSnapshot().context.chosenTool?.id).toBe('ndvi')
    await waitFor(() =>
      expect(within(panel).queryByRole('heading', { name: /^tools for /i })).toBeNull(),
    )

    await user.click(within(panel).getByRole('button', { name: /clear tool/i }))
    expect(dataFinderStore.getSnapshot().context.chosenTool).toBeUndefined()
    expect(
      await within(panel).findByRole('heading', { name: 'Tools for Sentinel-2 ARD' }),
    ).toBeInTheDocument()
  })

  it('shows a badge with the tool and its source when hidden, which opens the panel again', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3))
    chooseTool(ndviWorkflow)
    openRunPanel({ source: 'pinned' })
    await renderWithRunPanel()

    await user.click(hideButton(await runPanel()))
    const badge = screen.getByRole('button', { name: /NDVI · 3 pinned items/i })

    await user.click(badge)
    const panel = await runPanel()
    expect(dataFinderStore.getSnapshot().context.chosenTool?.id).toBe('ndvi')
    expect(panel).toHaveTextContent('NDVI')
  })
})

describe('Run form in the panel', () => {
  it('runs on this item, as one form with no steps', async () => {
    const one = fanOutItem('S2A_ONE')
    const panel = await openForm('item', { item: one })

    expect(sourceRadio(panel, /this item/i)).toBeChecked()
    expect(panel).toHaveTextContent('S2A_ONE')
    expect(reviewLine(panel)).toHaveTextContent(/\b1 job\b/i)
    expect(within(panel).queryByRole('button', { name: 'Next' })).toBeNull()
  })

  it('runs on the pinned items, and the job count follows pins and unpins', async () => {
    const user = userEvent.setup()
    const pinned = fanOutItems(3, 'S2A_PIN')
    pinItems(pinned)
    const panel = await openForm('pinned')
    expect(sourceRadio(panel, /pinned items/i)).toBeChecked()
    expect(reviewLine(panel)).toHaveTextContent(/\b3 jobs\b/i)

    const [first] = dataFinderStore.getSnapshot().context.pinnedItems
    act(() => {
      dataFinderStore.send({ type: 'removePinnedItem', item: first })
    })
    await waitFor(() => expect(reviewLine(panel)).toHaveTextContent(/\b2 jobs\b/i))

    await user.click(runWorkflowButton(panel))
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(2))
    expect(new Set(sentItemLinks(vi.mocked(launchWorkflow).mock.calls))).toEqual(
      new Set(pinned.slice(1).map((entry) => fanOutItemHref(entry.id))),
    )
  })

  it('runs on a saved set', async () => {
    const user = userEvent.setup()
    const panel = await openForm('set')
    expect(sourceRadio(panel, /saved set/i)).toBeChecked()

    await user.click(await within(panel).findByRole('radio', { name: /coastal set/i }))
    await waitFor(() => expect(reviewLine(panel)).toHaveTextContent(/\b3 jobs\b/i))
  })

  it('runs on all results, and the job count follows the search filters', async () => {
    const panel = await openForm('results')
    expect(sourceRadio(panel, /all results/i)).toBeChecked()
    await waitFor(() =>
      expect(reviewLine(panel)).toHaveTextContent(new RegExp(`\\b${results.length} jobs\\b`, 'i')),
    )

    vi.mocked(searchItems).mockResolvedValue(fanOutItems(5, 'S2A_CLOUDLESS'))
    act(() => {
      dataFinderStore.send({ type: 'queryFilterChange', queryFilter: { limit: 100, cloud: 10 } })
    })
    await waitFor(() => expect(reviewLine(panel)).toHaveTextContent(/\b5 jobs\b/i))
  })

  it('stays open on the same form while the search results reload', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const panel = await openForm('results', {}, queryClient)
    await waitFor(() =>
      expect(reviewLine(panel)).toHaveTextContent(new RegExp(`\\b${results.length} jobs\\b`, 'i')),
    )
    const callsBefore = vi.mocked(searchItems).mock.calls.length

    let finishReload: ((items: Item[]) => void) | undefined
    vi.mocked(searchItems).mockImplementation(
      () => new Promise<Item[]>((resolve) => (finishReload = resolve)),
    )
    act(() => {
      void queryClient.invalidateQueries({ queryKey: ['Items'] })
    })
    await waitFor(() => expect(finishReload).toBeDefined())

    // While the reload is in flight
    expect(await runPanel()).toBe(panel)
    expect(sourceRadio(panel, /all results/i)).toBeChecked()

    act(() => finishReload!(fanOutItems(4, 'S2A_RELOADED')))
    await waitFor(() => expect(reviewLine(panel)).toHaveTextContent(/\b4 jobs\b/i))
    expect(await runPanel()).toBe(panel)
    expect(vi.mocked(searchItems).mock.calls.length).toBe(callsBefore + 1)
  })

  it('asks to confirm above the confirmation threshold and blocks above the ceiling as pins change', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(CONFIRM_JOBS_ABOVE + 1, 'S2A_A'))
    const panel = await openForm('pinned')

    const confirm = within(panel).getByRole('checkbox', {
      name: new RegExp(`yes, start ${CONFIRM_JOBS_ABOVE + 1} jobs`, 'i'),
    })
    expect(runWorkflowButton(panel)).toBeDisabled()
    await user.click(confirm)
    expect(runWorkflowButton(panel)).toBeEnabled()

    act(() => pinItems(fanOutItems(MAX_JOBS_PER_RUN - CONFIRM_JOBS_ABOVE, 'S2A_B')))
    expect(
      await within(panel).findByText(new RegExp(`at most ${MAX_JOBS_PER_RUN} jobs`, 'i')),
    ).toBeInTheDocument()
    expect(runWorkflowButton(panel)).toBeDisabled()
  })

  it('blocks a run on private items for a workflow that reads items by link', async () => {
    pinItems([fanOutItem('PRIVATE_1', { collection: 'purchased_s2' })], {
      isUserCollection: true,
      collection: workspaceCollection,
    })
    const panel = await openForm('pinned', { tool: anyDatasetWorkflow })

    expect(await within(panel).findByText(/cannot read private data/i)).toBeInTheDocument()
    expect(runWorkflowButton(panel)).toBeDisabled()
  })

  it('includes the area once one is drawn on the map', async () => {
    pinItems(fanOutItems(2))
    const panel = await openForm('pinned')
    expect(within(panel).getByText(/draw an area on the map/i)).toBeInTheDocument()

    act(() => {
      dataFinderStore.send({ type: 'storeAoi', aoi })
    })
    await waitFor(() =>
      expect(
        within(panel).getByRole('checkbox', { name: /include area of interest/i }),
      ).toBeChecked(),
    )
  })

  it('shows the started and failed jobs, and Retry these sends only the failed items', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3, 'S2A_RETRY'))
    vi.mocked(launchWorkflow).mockImplementation((_url, variables) =>
      String(variables.stac_item).endsWith('S2A_RETRY_2')
        ? Promise.reject(new Error('Service unavailable'))
        : Promise.resolve({ workflowId: 'job-ok', status: 'accepted', submittedAt: '' }),
    )
    const panel = await openForm('pinned')

    expect(await runAndWait(user, panel)).toHaveTextContent(/\b2 jobs started\b/i)
    expect(panel).toHaveTextContent('S2A_RETRY_2')
    expect(within(panel).queryByRole('button', { name: 'Run workflow' })).toBeNull()

    vi.mocked(launchWorkflow).mockClear()
    vi.mocked(launchWorkflow).mockResolvedValue({
      workflowId: 'job-retried',
      status: 'accepted',
      submittedAt: '',
    })
    await user.click(within(panel).getByRole('button', { name: 'Retry these' }))

    await waitFor(() =>
      expect(within(panel).queryByRole('button', { name: 'Retry these' })).toBeNull(),
    )
    expect(sentItemLinks(vi.mocked(launchWorkflow).mock.calls)).toEqual([
      fanOutItemHref('S2A_RETRY_2'),
    ])
  })

  it('goes back to the form with the same tool, source and inputs on Run again', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    const panel = await openForm('pinned')
    const threshold = within(panel).getByLabelText('Threshold')
    await user.clear(threshold)
    await user.type(threshold, '0.5')

    await runAndWait(user, panel)
    await user.click(within(panel).getByRole('button', { name: 'Run again' }))

    expect(await within(panel).findByRole('button', { name: 'Run workflow' })).toBeInTheDocument()
    expect(panel).toHaveTextContent('NDVI')
    expect(sourceRadio(panel, /pinned items/i)).toBeChecked()
    expect(within(panel).getByLabelText('Threshold')).toHaveValue(0.5)
  })
})

describe('Review date span', () => {
  const dated = (id: string, datetime: string) => fanOutItem(id, { properties: { datetime } })

  it('shows the date span of several items', async () => {
    pinItems([
      dated('S2A_MAY', '2026-05-25T11:00:00Z'),
      dated('S2A_AUG', '2026-08-13T11:00:00Z'),
      dated('S2A_JUL', '2026-07-01T11:00:00Z'),
    ])
    const panel = await openForm('pinned')
    expect(reviewLine(panel)).toHaveTextContent(/3 jobs · items from 25 May to 13 Aug 2026/i)
  })

  it('shows the date of one item', async () => {
    const panel = await openForm('item', { item: dated('S2A_ONE', '2025-06-01T11:00:00Z') })
    expect(reviewLine(panel)).toHaveTextContent(/1 job\b.*1 Jun 2025/i)
    expect(reviewLine(panel)).not.toHaveTextContent(/\bto\b/i)
  })

  it('shows one date for items from the same day', async () => {
    pinItems([dated('S2A_AM', '2025-06-01T09:00:00Z'), dated('S2A_PM', '2025-06-01T15:00:00Z')])
    const panel = await openForm('pinned')
    expect(reviewLine(panel)).toHaveTextContent(/2 jobs\b.*1 Jun 2025/i)
    expect(reviewLine(panel)).not.toHaveTextContent(/\bto\b/i)
  })

  it('has no date fields for a workflow with no date input', async () => {
    pinItems(fanOutItems(2))
    const panel = await openForm('pinned')
    expect(panel.querySelector('input[type="date"]')).toBeNull()
  })
})

describe('Workflow outputs tab', () => {
  it('lists the jobs from both lists with the jobs from this visit at the top, newest first', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2, 'S2A_VISIT'))
    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse([
        listedJob('job-1', 'ndvi', 'running', '2026-11-02T10:00:01Z'),
        listedJob('colleague-1', 'clip', 'failed', '2026-11-02T12:00:00Z'),
        listedJob('job-2', 'ndvi', 'running', '2026-11-02T10:00:02Z'),
      ]),
    )
    vi.mocked(fetchJobsForWorkspace).mockResolvedValue(
      jobsResponse([listedJob('old-1', 'clip', 'successful', '2026-11-01T08:00:00Z')]),
    )
    const panel = await openForm('pinned')
    await runAndWait(user, panel)

    await user.click(outputsTab(panel))
    await waitFor(() => expect(jobLinks(panel)).toHaveLength(4))
    expect(jobIds(panel)).toEqual(['job-2', 'job-1', 'colleague-1', 'old-1'])
    const row = within(panel)
      .getAllByRole('link')
      .find((link) => link.getAttribute('href')?.endsWith('/job-1'))!
      .closest<HTMLElement>('li, tr, [role="row"], [role="listitem"]')!
    expect(row).toHaveTextContent('NDVI')
    expect(row).toHaveTextContent('S2A_VISIT_1')
    expect(row).toHaveTextContent(/running/i)
  })

  it("lists a job that is only in the user's own list", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchJobsForWorkspace).mockResolvedValue(
      jobsResponse([listedJob('mine-1', 'clip', 'successful')]),
    )
    openRunPanel()
    await renderWithRunPanel()
    const panel = await runPanel()

    await user.click(outputsTab(panel))
    await waitFor(() => expect(jobIds(panel)).toEqual(['mine-1']))
    expect(fetchJobsForWorkspace).toHaveBeenCalledWith('my-ws', 'token')
  })

  it('opens the Workflow outputs tab from View in Workflow outputs after a run', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    const panel = await openForm('pinned')
    await runAndWait(user, panel)

    await user.click(within(panel).getByRole('button', { name: 'View in Workflow outputs' }))
    expect(outputsTab(panel)).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the running and finished jobs of the run on the badge', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse([
        listedJob('job-1', 'ndvi', 'running'),
        listedJob('job-2', 'ndvi', 'successful'),
      ]),
    )
    const panel = await openForm('pinned')
    await runAndWait(user, panel)
    await user.click(hideButton(panel))

    expect(
      await screen.findByRole('button', { name: /NDVI · 1 running, 1 finished/i }),
    ).toBeInTheDocument()
  })

  it('links Open Workflow outputs to the page, filtered to the chosen workflow when there is one', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    const panel = await openForm('pinned')
    const outputsLink = () => within(panel).getByRole('link', { name: 'Open Workflow outputs' })

    await user.click(outputsTab(panel))
    expect(outputsLink()).toHaveAttribute('href', '/my-data/workflow-outputs?workflow=ndvi')

    await user.click(toolsTab(panel))
    await user.click(within(panel).getByRole('button', { name: /clear tool/i }))
    await user.click(outputsTab(panel))
    expect(outputsLink()).toHaveAttribute('href', '/my-data/workflow-outputs')
  })

  it('shows an error with Try again when the jobs do not load, and the Tools tab still works', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchJobsForWorkspace).mockRejectedValue(new Error('Jobs service unavailable'))
    openRunPanel()
    await renderWithRunPanel()
    const panel = await runPanel()

    await user.click(outputsTab(panel))
    const tryAgain = await within(panel).findByRole('button', { name: 'Try again' })
    expect(panel).toHaveTextContent(/could not|couldn't|unable|failed|error|unavailable/i)
    const callsBefore = vi.mocked(fetchJobsForWorkspace).mock.calls.length
    await user.click(tryAgain)
    await waitFor(() =>
      expect(vi.mocked(fetchJobsForWorkspace).mock.calls.length).toBe(callsBefore + 1),
    )

    await user.click(toolsTab(panel))
    expect(
      await within(panel).findByRole('heading', { name: 'Tools for Sentinel-2 ARD' }),
    ).toBeInTheDocument()
  })
})

describe('Job status refresh', () => {
  const REFRESH_MS = 30_000
  const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

  const startRun = async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    pinItems(fanOutItems(2))
    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse([listedJob('job-1', 'ndvi', 'running'), listedJob('job-2', 'ndvi', 'running')]),
    )
    const panel = await openForm('pinned')
    await runAndWait(user, panel)
    await user.click(outputsTab(panel))
    await waitFor(() => expect(jobLinks(panel)).toHaveLength(2))
    // Let any fetch the run itself started finish before counting
    await wait(100)
    return panel
  }

  it('refreshes every 30 seconds while a job from this visit runs, and stops when they finish', async () => {
    const panel = await startRun()
    const before = sharedListCalls()

    await wait(REFRESH_MS - 1_000)
    expect(sharedListCalls()).toBe(before)
    await wait(1_000)
    expect(sharedListCalls()).toBe(before + 1)
    expect(await runPanel()).toBe(panel)
    expect(outputsTab(panel)).toHaveAttribute('aria-selected', 'true')

    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse([
        listedJob('job-1', 'ndvi', 'successful'),
        listedJob('job-2', 'ndvi', 'failed'),
      ]),
    )
    await wait(REFRESH_MS)
    expect(sharedListCalls()).toBe(before + 2)

    await wait(REFRESH_MS * 3)
    expect(sharedListCalls()).toBe(before + 2)
  })

  it("reads the shared jobs list on each refresh, not the user's own list", async () => {
    await startRun()
    const sharedBefore = sharedListCalls()
    const userBefore = userListCalls()

    await wait(REFRESH_MS)
    expect(sharedListCalls()).toBe(sharedBefore + 1)
    expect(fetchJobsForSharedWorkspace).toHaveBeenLastCalledWith('wf-ws', 'my-ws', 'token')
    await wait(REFRESH_MS)
    expect(sharedListCalls()).toBe(sharedBefore + 2)
    expect(userListCalls()).toBe(userBefore)
  })

  it('moves the badge from running to finished for a job listed only in the shared list, then stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse([listedJob('job-1', 'ndvi', 'running')]),
    )
    const panel = await openForm('item', { item: fanOutItem('S2A_SHARED') })
    await user.click(runWorkflowButton(panel))
    await within(panel).findByRole('button', { name: 'View in Workflow outputs' })
    await user.click(hideButton(panel))
    expect(await screen.findByRole('button', { name: /NDVI · 1 running/i })).toBeInTheDocument()

    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse([listedJob('job-1', 'ndvi', 'successful')]),
    )
    await wait(REFRESH_MS)
    const badge = await screen.findByRole('button', { name: /NDVI · 1 finished/i })
    expect(badge).not.toHaveAccessibleName(/[1-9] running/i)

    const after = sharedListCalls()
    await wait(REFRESH_MS * 3)
    expect(sharedListCalls()).toBe(after)
  })

  it('stops refreshing when the user leaves the Data Finder', async () => {
    await startRun()
    const before = sharedListCalls()

    cleanup()
    await wait(REFRESH_MS * 3)
    expect(sharedListCalls()).toBe(before)
  })
})

describe('Notebooks in the run panel', () => {
  it('asks for an item when the notebook has none', async () => {
    chooseTool(itemNotebook)
    openRunPanel()
    await renderWithRunPanel()
    const panel = await runPanel()

    expect(
      await within(panel).findByText(
        /choose an item, then select open in NDVI notebook on its card/i,
      ),
    ).toBeInTheDocument()
    const launch = within(panel).queryByRole('button', { name: 'Launch' })
    expect(launch === null || launch.hasAttribute('disabled')).toBe(true)
  })

  it('launches the notebook with the item through useNotebookLaunch', async () => {
    const user = userEvent.setup()
    const one = fanOutItem('S2A_NOTEBOOK')
    chooseTool(itemNotebook)
    openRunPanel({ item: one })
    await renderWithRunPanel()
    const panel = await runPanel()

    expect(panel).toHaveTextContent('S2A_NOTEBOOK')
    expect(vi.mocked(useNotebookLaunch)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        notebook: expect.objectContaining({ id: 'ndvi_notebook' }),
        context: expect.objectContaining({ item: expect.objectContaining({ id: 'S2A_NOTEBOOK' }) }),
      }),
    )
    await user.click(within(panel).getByRole('button', { name: 'Launch' }))
    expect(launchNotebook).toHaveBeenCalledTimes(1)
  })

  /** Run workflow on an item from Integration Tools with no tool chosen, then the notebook from the list. */
  const chooseNotebookForItem = async (user: User, item: Item) => {
    dataFinderStore.send({ type: 'clearTool' })
    openRunPanel({ source: 'item', item })
    await renderWithRunPanel()
    await user.click(await toolEntry(await runPanel(), 'NDVI notebook'))
    return runPanel()
  }

  it('ignores an item the chosen notebook does not apply to, on the form and the badge', async () => {
    const user = userEvent.setup()
    act(() => {
      dataFinderStore.send({ type: 'setCollection', collection: landsat })
    })
    const panel = await chooseNotebookForItem(
      user,
      fanOutItem('LC09_OTHER', { collection: 'landsat_c2l2' }),
    )

    expect(
      await within(panel).findByText(
        /choose an item, then select open in NDVI notebook on its card/i,
      ),
    ).toBeInTheDocument()
    expect(panel).not.toHaveTextContent('LC09_OTHER')
    const launch = within(panel).queryByRole('button', { name: 'Launch' })
    expect(launch === null || launch.hasAttribute('disabled')).toBe(true)

    await user.click(hideButton(panel))
    expect(screen.getByRole('button', { name: /^NDVI notebook$/i })).toBeInTheDocument()
  })

  it('keeps an item the chosen notebook applies to, on the form and the badge', async () => {
    const user = userEvent.setup()
    const panel = await chooseNotebookForItem(user, fanOutItem('S2A_FITS'))

    expect(await within(panel).findByText('S2A_FITS')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Launch' })).toBeEnabled()

    await user.click(hideButton(panel))
    expect(screen.getByRole('button', { name: /^NDVI notebook · S2A_FITS$/i })).toBeInTheDocument()
  })
})
