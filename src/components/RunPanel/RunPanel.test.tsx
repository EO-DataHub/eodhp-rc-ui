import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import type { Collection, Item, ProcessDetail, WorkflowJob } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems as fetchCatalogue } from '@/services/processCatalogueService'
import { fetchItemByUrl, fetchItems as searchItems } from '@/services/itemService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchSavedSet, fetchSavedSets } from '@/services/savedSetsService'
import {
  fetchJobResults,
  fetchJobsForSharedWorkspace,
  fetchJobsForWorkspace,
} from '@/services/workflowJobService'
import { useNotebookLaunch } from '@/hooks/useNotebookLaunch'
import { MAX_TOTAL_ITEMS, PAGE_SIZE } from '@/hooks/useItemsQuery'
import {
  aoi,
  anyDatasetWorkflow,
  fetchToolsFromFixtures,
  item,
  ITEM_SELF_HREF,
  itemNotebook,
  itemWithoutLink,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import {
  clearPins,
  datesWorkflow,
  fanOutItem,
  fanOutItemHref,
  fanOutItems,
  pinItems,
  privateSetItem,
  savedSet,
  sentinelCollection,
  sentItemLinks,
  setItem,
  stubPointerApis,
  summaryOf,
  workspaceCollection,
} from '@/test-data/runWorkflowFanOut'
import { signedInAuth, type ProviderOptions } from '@/test-data/runWorkflowRender'
import {
  chooseTool,
  fetchAnyToolById,
  assetHref,
  DATA_ASSET_TITLES,
  fetchResultItem,
  hideRunPanel,
  jobLinks,
  jobResultsHref,
  jobRow,
  jobRowsIn,
  jobsResponse,
  listedJob,
  OTHER_ASSET_TITLES,
  resultCollection,
  resultItemHref,
  openRunPanel,
  queryRunPanel,
  renderWithRunPanel,
  runPanel,
  runWorkflowButton,
  sourceRadio,
  viewedJob,
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
  fetchItemByUrl: vi.fn(),
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
  { tool = ndviWorkflow, item, setId }: { tool?: ProcessDetail; item?: Item; setId?: string } = {},
  providerOptions: ProviderOptions = {},
) => {
  chooseTool(tool)
  openRunPanel({ source, item, setId })
  await renderWithRunPanel(null, providerOptions)
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
    const panel = await openForm('results', {}, { queryClient })
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

  it('shows the started and failed jobs with their errors, and Retry these sends only the failed items', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3, 'S2A_RETRY'))
    vi.mocked(launchWorkflow).mockImplementation((_url, variables) =>
      String(variables.stac_item).endsWith('S2A_RETRY_2')
        ? Promise.reject(new Error('Service unavailable'))
        : Promise.resolve({ workflowId: 'job-ok', status: 'accepted', submittedAt: '' }),
    )
    const panel = await openForm('pinned')

    expect(await runAndWait(user, panel)).toHaveTextContent(/\b2 jobs started\b/i)
    expect(panel).toHaveTextContent(/\b1 failed to start\b/i)
    expect(panel).toHaveTextContent('S2A_RETRY_2')
    expect(panel).toHaveTextContent('Service unavailable')
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

describe('Run form details', () => {
  const launches = () => vi.mocked(launchWorkflow).mock.calls
  const sentVariables = (index: number) => launches()[index][1] as Record<string, unknown>
  const areaCheckbox = (panel: HTMLElement) =>
    within(panel).getByRole('checkbox', { name: /include area of interest/i })

  it('sends the Hub values, the drawn area and the user values, and leaves the area out once unticked', async () => {
    const user = userEvent.setup()
    act(() => {
      dataFinderStore.send({ type: 'storeAoi', aoi })
    })
    const panel = await openForm('item', { item })

    expect(panel).toHaveTextContent('STAC item')
    expect(panel).toHaveTextContent(item.id)
    expect(panel).toHaveTextContent(/the area drawn on the map/i)
    expect(within(panel).queryByRole('textbox', { name: 'STAC item' })).toBeNull()
    expect(within(panel).getByLabelText('Threshold')).toHaveValue(0.3)
    expect(panel).toHaveTextContent('my-ws')

    await user.click(runWorkflowButton(panel))
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(1))
    expect(fetchWorkspaceTokens).toHaveBeenCalledWith('my-ws', 'token')
    expect(launches()[0][2]).toBe('ws-token')
    expect(sentVariables(0)).toMatchObject({ stac_item: ITEM_SELF_HREF, aoi: JSON.stringify(aoi) })
    expect(String(sentVariables(0).threshold)).toBe('0.3')

    await user.click(await within(panel).findByRole('button', { name: 'Run again' }))
    await user.click(areaCheckbox(panel))
    expect(areaCheckbox(panel)).not.toBeChecked()
    await user.click(runWorkflowButton(panel))
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(2))
    expect(sentVariables(1)).not.toHaveProperty('aoi')
    expect(sentVariables(1)).toMatchObject({ stac_item: ITEM_SELF_HREF })
  })

  it('disables Run workflow and asks for a workspace when none is selected', async () => {
    const user = userEvent.setup()
    const panel = await openForm(
      'item',
      { item },
      { auth: signedInAuth({ currentWorkspace: undefined }) },
    )

    expect(panel).toHaveTextContent(/select a workspace to run/i)
    expect(runWorkflowButton(panel)).toBeDisabled()
    await user.click(runWorkflowButton(panel))
    expect(launchWorkflow).not.toHaveBeenCalled()
  })

  it('disables Run workflow and sends no job when the item has no self link', async () => {
    const user = userEvent.setup()
    const panel = await openForm('item', { item: itemWithoutLink })

    expect(within(panel).getByText(/this item has no link/i)).toBeInTheDocument()
    expect(runWorkflowButton(panel)).toBeDisabled()
    await user.click(runWorkflowButton(panel))
    expect(fetchWorkspaceTokens).not.toHaveBeenCalled()
    expect(launchWorkflow).not.toHaveBeenCalled()
  })

  it('shows the error when the only job fails to start, and keeps the form and its inputs', async () => {
    const user = userEvent.setup()
    vi.mocked(launchWorkflow).mockRejectedValueOnce(
      new Error('Insufficient permissions to launch this workflow.'),
    )
    const panel = await openForm('item', { item })
    const threshold = within(panel).getByLabelText('Threshold')
    await user.clear(threshold)
    await user.type(threshold, '0.5')
    await user.click(runWorkflowButton(panel))

    expect(
      await within(panel).findByText('Insufficient permissions to launch this workflow.'),
    ).toBeInTheDocument()
    expect(runWorkflowButton(panel)).toBeInTheDocument()
    expect(within(panel).getByLabelText('Threshold')).toHaveValue(0.5)
  })

  it('disables the Run on choices that cannot be used, with the reason', async () => {
    const panel = await openForm('results')

    expect(sourceRadio(panel, /this item/i)).toBeDisabled()
    expect(sourceRadio(panel, /pinned items/i)).toBeDisabled()
    expect(panel).toHaveTextContent(/pin some items on the map first/i)
    expect(sourceRadio(panel, /all results/i)).toBeEnabled()
  })

  it('says All results uses only the first results once the results reach the cap', async () => {
    const capText = new RegExp(`uses the first ${MAX_TOTAL_ITEMS} results`, 'i')
    const panel = await openForm('results')
    await waitFor(() =>
      expect(reviewLine(panel)).toHaveTextContent(new RegExp(`\\b${results.length} jobs\\b`, 'i')),
    )
    expect(panel).not.toHaveTextContent(capText)

    vi.mocked(searchItems).mockResolvedValue(fanOutItems(MAX_TOTAL_ITEMS, 'S2A_CAP'))
    act(() => {
      dataFinderStore.send({ type: 'queryFilterChange', queryFilter: { limit: 100, cloud: 5 } })
    })
    await waitFor(() => expect(panel).toHaveTextContent(capText))
  })

  it('submits 4 jobs at once, and the next as each one returns', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(6))
    let inFlight = 0
    let maxInFlight = 0
    const pending: (() => void)[] = []
    vi.mocked(launchWorkflow).mockImplementation(
      () =>
        new Promise((resolve) => {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          pending.push(() => {
            inFlight -= 1
            resolve({ workflowId: `job-${launches().length}`, status: 'accepted', submittedAt: '' })
          })
        }),
    )
    const panel = await openForm('pinned', { tool: anyDatasetWorkflow })
    await user.click(runWorkflowButton(panel))

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(4))
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(launchWorkflow).toHaveBeenCalledTimes(4)

    await act(() => Promise.resolve(pending.shift()!()))
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(5))

    for (let round = 0; round < 20 && (pending.length > 0 || launches().length < 6); round++) {
      await act(() => Promise.resolve(pending.shift()?.()))
    }
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(6))
    expect(maxInFlight).toBe(4)
    expect(await within(panel).findByText(/\b6 jobs started\b/i)).toBeInTheDocument()
  })

  it('shows date fields for date inputs, blocks a half-filled date range and sends the dates', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    const panel = await openForm('pinned', { tool: datesWorkflow })

    const start = within(panel).getByLabelText('Start date')
    expect(start).toHaveAttribute('type', 'date')
    const [periodStart, periodEnd] = Array.from(
      panel.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    ).filter((field) => field !== start)
    expect(periodEnd).toBeDefined()

    fireEvent.change(start, { target: { value: '2025-06-01' } })
    fireEvent.change(periodStart, { target: { value: '2025-06-01' } })
    expect(runWorkflowButton(panel)).toBeDisabled()

    fireEvent.change(periodEnd, { target: { value: '2025-06-30' } })
    expect(runWorkflowButton(panel)).toBeEnabled()
    await user.click(runWorkflowButton(panel))

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(2))
    expect(sentVariables(0).start).toBe('2025-06-01')
    expect(String(sentVariables(0).period)).toContain('2025-06-01')
    expect(String(sentVariables(0).period)).toContain('2025-06-30')
  })
})

describe('Saved set in the run panel', () => {
  /** Text in one element that says how many items are private. */
  const privateCountMessage = (panel: HTMLElement, count: number) =>
    within(panel).queryAllByText(
      (_, element) =>
        !!element &&
        /private/i.test(element.textContent ?? '') &&
        new RegExp(`\\b${count}\\b`).test(element.textContent ?? '') &&
        Array.from(element.children).every((child) => !/private/i.test(child.textContent ?? '')),
    )

  it('opens on the saved set chosen in the store and runs one job per item with its saved link', async () => {
    const user = userEvent.setup()
    const panel = await openForm('set', { tool: anyDatasetWorkflow, setId: set.id })

    expect(sourceRadio(panel, /saved set/i)).toBeChecked()
    expect(await within(panel).findByRole('radio', { name: /coastal set/i })).toBeChecked()
    await waitFor(() => expect(reviewLine(panel)).toHaveTextContent(/\b3 jobs\b/i))

    expect(await runAndWait(user, panel)).toHaveTextContent(/\b3 jobs started\b/i)
    expect(new Set(sentItemLinks(vi.mocked(launchWorkflow).mock.calls))).toEqual(
      new Set(set.items.map((entry) => entry.selfHref)),
    )
  })

  it('blocks private set items for a workflow that reads items by link, not one that stages them in', async () => {
    const mixedSet = savedSet([
      setItem('S2A_SET_1'),
      privateSetItem('PURCHASED_1'),
      privateSetItem('PURCHASED_2'),
    ])
    vi.mocked(fetchSavedSets).mockResolvedValue([summaryOf(mixedSet)])
    vi.mocked(fetchSavedSet).mockResolvedValue(mixedSet)
    const panel = await openForm('set', { tool: anyDatasetWorkflow, setId: mixedSet.id })

    await waitFor(() => expect(privateCountMessage(panel, 2).length).toBeGreaterThan(0))
    expect(runWorkflowButton(panel)).toBeDisabled()

    chooseTool(ndviWorkflow)
    await waitFor(() => expect(runWorkflowButton(panel)).toBeEnabled())
    expect(privateCountMessage(panel, 2)).toHaveLength(0)
  })
})

describe('Dataset list from the tool list', () => {
  it('opens the dataset list for a tool for other collections, not for a tool for this dataset', async () => {
    const user = userEvent.setup()
    const isDatasetListOpen = () => dataFinderStore.getSnapshot().context.isDatasetListOpen
    act(() => {
      dataFinderStore.send({ type: 'closeDatasetList' })
    })
    openRunPanel()
    await renderWithRunPanel()
    const panel = await runPanel()

    await user.click(await toolEntry(panel, 'NDVI'))
    expect(isDatasetListOpen()).toBe(false)

    await user.click(within(panel).getByRole('button', { name: /clear tool/i }))
    await user.click(await toolEntry(panel, 'Landsat surface temperature'))
    expect(isDatasetListOpen()).toBe(true)
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
    await waitFor(() => expect(jobRowsIn(panel)).toHaveLength(4))
    const [first, second, third, fourth] = jobRowsIn(panel)
    expect(first).toHaveTextContent('S2A_VISIT_2')
    expect(second).toHaveTextContent('NDVI')
    expect(second).toHaveTextContent('S2A_VISIT_1')
    expect(second).toHaveTextContent(/running/i)
    expect(third).toHaveTextContent(/clip.*failed/i)
    expect(fourth).toHaveTextContent(/clip.*successful/i)
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
    await waitFor(() => expect(jobRowsIn(panel)).toHaveLength(1))
    expect(jobRowsIn(panel)[0]).toHaveTextContent(/clip/)
    expect(fetchJobsForWorkspace).toHaveBeenCalledWith('my-ws', 'token')
  })

  it('opens the list in the Workflow outputs tab from View in Workflow outputs after a run of several jobs', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    const panel = await openForm('pinned')
    await runAndWait(user, panel)

    await user.click(within(panel).getByRole('button', { name: 'View in Workflow outputs' }))
    expect(outputsTab(panel)).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(jobRowsIn(panel)).toHaveLength(2))
    expect(within(panel).queryByRole('button', { name: /^back/i })).not.toBeInTheDocument()
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
    await waitFor(() => expect(jobRowsIn(panel)).toHaveLength(2))
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

describe('Job view in the panel', () => {
  const backButton = (panel: HTMLElement) => within(panel).queryByRole('button', { name: /^back/i })

  const downloadButtons = (container: HTMLElement) =>
    within(container).queryAllByRole('button', { name: /download/i })

  /** The status badge with the given text, and its colour. */
  const statusColour = (panel: HTMLElement, status: string) =>
    textElement(panel, new RegExp(`^${status}$`, 'i'))
      .closest('[data-accent-color]')
      ?.getAttribute('data-accent-color')

  /** Adds jobs to this visit, as a run does, and lists them in the shared jobs list. */
  const startedJobs = (entries: [WorkflowJob, string][]) => {
    act(() => {
      dataFinderStore.send({
        type: 'addVisitJobs',
        jobs: entries.map(([job, itemId]) => ({
          jobId: job.id,
          itemId,
          workflowId: 'ndvi',
          workflowTitle: 'NDVI',
          startedAt: job.created,
        })),
      })
    })
    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse(entries.map(([job]) => job)),
    )
  }

  const openOutputs = async (user: User) => {
    openRunPanel()
    await renderWithRunPanel()
    const panel = await runPanel()
    await user.click(outputsTab(panel))
    return panel
  }

  const openJob = async (user: User, panel: HTMLElement, itemId: string) => {
    const row = await waitFor(() => jobRow(panel, itemId))
    await user.click(within(row).getAllByRole('button')[0])
    await within(panel).findByRole('button', { name: /^back/i })
  }

  /** Opens the panel on the view of one job started in this visit. */
  const viewJob = async (user: User, job: WorkflowJob, itemId = 'S2A_IN_1') => {
    startedJobs([[job, itemId]])
    const panel = await openOutputs(user)
    await openJob(user, panel, itemId)
    return panel
  }

  beforeEach(() => {
    dataFinderStore.send({ type: 'resetRunPanel' })
    vi.mocked(fetchJobResults).mockResolvedValue(resultCollection(['S2A_OUT_1']))
    vi.mocked(fetchItemByUrl).mockImplementation(fetchResultItem)
  })

  it('opens a job in place of the list, with no link to the job page, and Back returns to the list', async () => {
    const user = userEvent.setup()
    startedJobs([
      [viewedJob('job-a', 'running'), 'S2A_IN_1'],
      [viewedJob('job-b', 'failed'), 'S2A_IN_2'],
    ])
    const panel = await openOutputs(user)
    await waitFor(() => expect(jobRowsIn(panel)).toHaveLength(2))
    expect(jobLinks(panel)).toEqual([])

    await openJob(user, panel, 'S2A_IN_1')
    expect(panel).toHaveTextContent('S2A_IN_1')
    expect(panel).not.toHaveTextContent('S2A_IN_2')

    await user.click(backButton(panel)!)
    await waitFor(() => expect(jobRowsIn(panel)).toHaveLength(2))
    expect(backButton(panel)).not.toBeInTheDocument()
  })

  it('keeps the open job after switching tabs and hiding the panel, and forgets it on leaving the Data Finder', async () => {
    const user = userEvent.setup()
    const panel = await viewJob(user, viewedJob('job-run', 'running'))
    expect(dataFinderStore.getSnapshot().context.openJobId).toBe('job-run')

    await user.click(toolsTab(panel))
    await user.click(outputsTab(panel))
    expect(await within(panel).findByRole('button', { name: /^back/i })).toBeInTheDocument()
    expect(panel).toHaveTextContent('S2A_IN_1')

    await user.click(hideButton(panel))
    openRunPanel()
    const reopened = await runPanel()
    await user.click(outputsTab(reopened))
    expect(await within(reopened).findByRole('button', { name: /^back/i })).toBeInTheDocument()
    expect(reopened).toHaveTextContent('S2A_IN_1')

    cleanup()
    expect(dataFinderStore.getSnapshot().context.openJobId).toBeFalsy()
    const afterLeaving = await openOutputs(user)
    await waitFor(() => expect(jobRowsIn(afterLeaving)).toHaveLength(1))
    expect(backButton(afterLeaving)).not.toBeInTheDocument()
  })

  it('shows a running job with its title, item, status and run time, and a note in place of outputs', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T14:05:00Z'))
    const user = userEvent.setup()
    const panel = await viewJob(user, viewedJob('job-run', 'running'))

    expect(panel).toHaveTextContent('NDVI')
    expect(panel).toHaveTextContent('S2A_IN_1')
    expect(statusColour(panel, 'running')).toBe('blue')
    expect(panel).toHaveTextContent(/Started \d{1,2}:\d{2}\s*·\s*running for 3 min/i)
    expect(panel).toHaveTextContent('Outputs appear here when the job finishes.')
    expect(panel).not.toHaveTextContent('job-run')
    expect(downloadButtons(panel)).toHaveLength(0)
  })

  it("shows a failed job's status message and how long it took, with no outputs", async () => {
    const user = userEvent.setup()
    const panel = await viewJob(
      user,
      viewedJob('job-fail', 'failed', { message: 'The input item could not be read' }),
    )

    expect(panel).toHaveTextContent('NDVI')
    expect(panel).toHaveTextContent('S2A_IN_1')
    expect(statusColour(panel, 'failed')).toBe('red')
    expect(panel).toHaveTextContent(/Started \d{1,2}:\d{2}\s*·\s*took 3 min/i)
    expect(panel).toHaveTextContent('The input item could not be read')
    expect(panel).not.toHaveTextContent('job-fail')
    expect(panel).not.toHaveTextContent('Outputs appear here when the job finishes.')
    expect(downloadButtons(panel)).toHaveLength(0)
  })

  it("lists one result item's assets flat, data assets first, each with Download", async () => {
    const download = vi.fn(() => Promise.resolve(new Response('data')))
    vi.stubGlobal('fetch', download)
    const user = userEvent.setup()
    const panel = await viewJob(user, viewedJob('job-ok', 'successful'))

    await within(panel).findByText('NDVI GeoTIFF')
    expect(fetchJobResults).toHaveBeenCalledWith(jobResultsHref('job-ok'), 'ws-token')
    expect(panel).toHaveTextContent('S2A_IN_1')
    expect(statusColour(panel, 'successful')).toBe('green')
    expect(panel).toHaveTextContent(/Started \d{1,2}:\d{2}\s*·\s*took 3 min/i)
    expect(panel).not.toHaveTextContent('job-ok')

    for (const data of DATA_ASSET_TITLES) {
      for (const other of OTHER_ASSET_TITLES) {
        expect(isBefore(within(panel).getByText(data), within(panel).getByText(other))).toBe(true)
      }
    }
    expect(downloadButtons(panel)).toHaveLength(4)
    expect(within(panel).queryByRole('heading', { name: /S2A_OUT_1/ })).not.toBeInTheDocument()

    const cogRow = within(panel).getByText('NDVI GeoTIFF').closest('li')!
    await user.click(within(cogRow).getByRole('button', { name: /download/i }))
    await waitFor(() => expect(download).toHaveBeenCalled())
    expect(String((download.mock.calls[0] as unknown[])[0])).toBe(
      assetHref('S2A_OUT_1', 'ndvi.tif'),
    )
  })

  it('shows each of several result items under its own heading with its own asset list', async () => {
    vi.mocked(fetchJobResults).mockResolvedValue(resultCollection(['S2A_OUT_1', 'S2A_OUT_2']))
    const user = userEvent.setup()
    const panel = await viewJob(user, viewedJob('job-ok', 'successful'))

    const first = await within(panel).findByRole('heading', { name: /S2A_OUT_1/ })
    const second = await within(panel).findByRole('heading', { name: /S2A_OUT_2/ })
    expect(fetchItemByUrl).toHaveBeenCalledWith(
      expect.objectContaining({ itemUrl: resultItemHref('S2A_OUT_2') }),
    )
    const assetLists = within(panel)
      .getAllByRole('list')
      .filter((list) => !list.querySelector('ul, ol, [role="list"]'))
      .filter((list) => downloadButtons(list).length > 0)
    expect(assetLists).toHaveLength(2)
    expect(isBefore(first, assetLists[0])).toBe(true)
    expect(isBefore(assetLists[0], second)).toBe(true)
    expect(isBefore(second, assetLists[1])).toBe(true)
    for (const list of assetLists) {
      expect(downloadButtons(list)).toHaveLength(4)
      expect(
        isBefore(within(list).getByText('Cloud mask'), within(list).getByText('Thumbnail')),
      ).toBe(true)
    }
  })

  it('shows No outputs for a successful job with no results link', async () => {
    const user = userEvent.setup()
    const panel = await viewJob(user, { ...viewedJob('job-ok', 'successful'), links: [] })

    expect(await within(panel).findByText(/no outputs/i)).toBeInTheDocument()
    expect(downloadButtons(panel)).toHaveLength(0)
    expect(panel).not.toHaveTextContent('Outputs appear here when the job finishes.')
  })

  it('shows No outputs for a successful job whose results have no items', async () => {
    vi.mocked(fetchJobResults).mockResolvedValue(resultCollection([]))
    const user = userEvent.setup()
    const panel = await viewJob(user, viewedJob('job-ok', 'successful'))

    expect(await within(panel).findByText(/no outputs/i)).toBeInTheDocument()
    expect(fetchJobResults).toHaveBeenCalledWith(jobResultsHref('job-ok'), 'ws-token')
    expect(downloadButtons(panel)).toHaveLength(0)
  })

  it('opens the job details modal from Technical details', async () => {
    const user = userEvent.setup()
    const panel = await viewJob(user, viewedJob('job-fail', 'failed', { message: 'Broken' }))

    await user.click(within(panel).getByRole('button', { name: /technical details/i }))
    expect(await screen.findByRole('dialog', { name: /job details/i })).toBeInTheDocument()
  })

  it("opens the job's view from View in Workflow outputs after a run of one job", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse([listedJob('job-1', 'ndvi', 'running')]),
    )
    const panel = await openForm('item', { item: fanOutItem('S2A_ONE') })
    await user.click(runWorkflowButton(panel))

    await user.click(await within(panel).findByRole('button', { name: 'View in Workflow outputs' }))
    expect(outputsTab(panel)).toHaveAttribute('aria-selected', 'true')
    expect(await within(panel).findByRole('button', { name: /^back/i })).toBeInTheDocument()
    expect(panel).toHaveTextContent('S2A_ONE')
    expect(jobRowsIn(panel)).toHaveLength(0)
  })

  it('stays open on the job and shows its outputs when the 30-second refresh finds it finished', async () => {
    const REFRESH_MS = 30_000
    const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const panel = await viewJob(user, viewedJob('job-1', 'running'))
    await wait(100)
    const back = backButton(panel)
    const before = sharedListCalls()

    vi.mocked(fetchJobsForSharedWorkspace).mockResolvedValue(
      jobsResponse([viewedJob('job-1', 'successful')]),
    )
    await wait(REFRESH_MS)
    expect(sharedListCalls()).toBe(before + 1)
    expect(await within(panel).findByText('NDVI GeoTIFF')).toBeInTheDocument()
    expect(await runPanel()).toBe(panel)
    expect(backButton(panel)).toBe(back)
    expect(panel).not.toHaveTextContent('Outputs appear here when the job finishes.')
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
