import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems as fetchCatalogue } from '@/services/processCatalogueService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaces, fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchWorkspaceAdmins } from '@/services/workspaceMembersService'
import { fetchSavedSet, fetchSavedSets, type SavedSet } from '@/services/savedSetsService'
import { aoi, listRecord, stubBrowserGlobals } from '@/test-data/runWorkflow'
import {
  fanOutWorkflows,
  privateSetItem,
  savedSet,
  sentItemLinks,
  setItem,
  stubPointerApis,
  summaryOf,
} from '@/test-data/runWorkflowFanOut'
import { withProviders } from '@/test-data/runWorkflowRender'
import { SavedSetDetailPage } from './SavedSetDetailPage'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({
  fetchWorkspaceTokens: vi.fn(),
  fetchWorkspaces: vi.fn(),
}))
vi.mock('@/services/workspaceMembersService', () => ({ fetchWorkspaceAdmins: vi.fn() }))
vi.mock('@/services/savedSetsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/savedSetsService')>()),
  fetchSavedSets: vi.fn(),
  fetchSavedSet: vi.fn(),
}))

type User = ReturnType<typeof userEvent.setup>

const publicSet = savedSet([setItem('S2A_SET_1'), setItem('S2A_SET_2'), setItem('S2A_SET_3')])

const renderSetPage = (set: SavedSet = publicSet) => {
  vi.mocked(fetchSavedSet).mockResolvedValue(set)
  vi.mocked(fetchSavedSets).mockResolvedValue([summaryOf(set)])
  render(
    withProviders(<SavedSetDetailPage />, {
      url: `/my-data/saved-sets/${set.id}`,
      path: '/my-data/saved-sets/:setId',
    }),
  )
}

const openRunWorkflow = async (user: User, set?: SavedSet) => {
  renderSetPage(set)
  await user.click(await screen.findByRole('button', { name: 'Run workflow' }))
  return screen.findByRole('dialog')
}

const heading = (dialog: HTMLElement, name: RegExp) =>
  within(dialog).findByRole('heading', { name })

const clickNext = (user: User, dialog: HTMLElement) =>
  user.click(within(dialog).getByRole('button', { name: 'Next' }))

const chooseWorkflow = async (user: User, dialog: HTMLElement, title: string) => {
  await heading(dialog, /choose a workflow/i)
  await user.click(await within(dialog).findByText(title))
  await clickNext(user, dialog)
}

/** Goes on to the review step from the inputs step, when there is one. */
const toReview = async (user: User, dialog: HTMLElement) => {
  await waitFor(() =>
    expect(
      within(dialog).queryByRole('heading', { name: /check the inputs|review/i }),
    ).not.toBeNull(),
  )
  if (within(dialog).queryByRole('heading', { name: /check the inputs/i })) {
    await clickNext(user, dialog)
  }
  await heading(dialog, /review/i)
}

const runButton = (dialog: HTMLElement) => within(dialog).queryByRole('button', { name: /^run\b/i })

const launches = () => vi.mocked(launchWorkflow).mock.calls
const sentVariables = (index: number) => launches()[index][1] as Record<string, unknown>

/** Text in one element that says how many items are private. */
const privateCountMessage = (count: number) =>
  screen.queryAllByText(
    (_, element) =>
      !!element &&
      /private/i.test(element.textContent ?? '') &&
      new RegExp(`\\b${count}\\b`).test(element.textContent ?? '') &&
      Array.from(element.children).every((child) => !/private/i.test(child.textContent ?? '')),
  )

const drawAreaEarlier = () => localStorage.setItem('aoiData', JSON.stringify(aoi))

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  stubPointerApis()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'clearAllPinnedItems' })
  dataFinderStore.send({ type: 'storeAoi', aoi: undefined })

  vi.mocked(fetchCatalogue).mockResolvedValue({
    data: { items: fanOutWorkflows.map(listRecord) } as never,
    error: null,
  })
  vi.mocked(fetchItemById).mockImplementation((id) =>
    Promise.resolve({
      data: fanOutWorkflows.find((w) => w.id === id)!,
      error: null,
      notFound: false,
    }),
  )
  vi.mocked(fetchWorkspaces).mockResolvedValue([] as never)
  vi.mocked(fetchWorkspaceAdmins).mockResolvedValue([] as never)
  vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as never)
  vi.mocked(launchWorkflow).mockResolvedValue({
    workflowId: 'job',
    status: 'accepted',
    submittedAt: '2026-11-02T10:00:00Z',
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Stage 1: Saved set page Run workflow', () => {
  it('opens the dialog with the set as the source, at the workflow step', async () => {
    const user = userEvent.setup()
    const dialog = await openRunWorkflow(user)
    await heading(dialog, /choose a workflow/i)
    expect(
      within(dialog).queryByRole('heading', { name: /what do you want to run on/i }),
    ).toBeNull()
    expect(dialog).toHaveTextContent('Coastal set')
  })

  it('lists every workflow, including those for other datasets', async () => {
    const user = userEvent.setup()
    const dialog = await openRunWorkflow(user)
    expect(await within(dialog).findByText('Landsat surface temperature')).toBeInTheDocument()
    expect(within(dialog).getByText('NDVI')).toBeInTheDocument()
  })

  it('submits one job per item in the set, with the link saved for each item', async () => {
    const user = userEvent.setup()
    const dialog = await openRunWorkflow(user)
    await chooseWorkflow(user, dialog, 'Footprint')
    await toReview(user, dialog)
    expect(dialog).toHaveTextContent(/\b3 jobs\b/i)
    await user.click(runButton(dialog)!)

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(3))
    expect(new Set(sentItemLinks(launches()))).toEqual(
      new Set(publicSet.items.map((entry) => entry.selfHref)),
    )
    expect(await within(dialog).findByText(/\b3 jobs started\b/i)).toBeInTheDocument()
  })
})

describe('Stage 2: Private items in a saved set', () => {
  const mixedSet = savedSet([
    setItem('S2A_SET_1'),
    setItem('S2A_SET_2'),
    privateSetItem('PURCHASED_1'),
    privateSetItem('PURCHASED_2'),
  ])

  it('blocks the run and counts the private items when the input has no stage-in', async () => {
    const user = userEvent.setup()
    const dialog = await openRunWorkflow(user, mixedSet)
    await chooseWorkflow(user, dialog, 'Footprint')
    await toReview(user, dialog)

    expect(privateCountMessage(2).length).toBeGreaterThan(0)
    expect(runButton(dialog)).toBeDisabled()
    await user.click(runButton(dialog)!)
    expect(launchWorkflow).not.toHaveBeenCalled()
  })

  it('runs on private items when the item input uses stage-in', async () => {
    const user = userEvent.setup()
    const dialog = await openRunWorkflow(user, mixedSet)
    await chooseWorkflow(user, dialog, 'NDVI')
    await toReview(user, dialog)
    expect(privateCountMessage(2)).toHaveLength(0)
    expect(runButton(dialog)).toBeEnabled()
  })
})

describe('Stage 3: Area and dates from a saved set', () => {
  const useAreaCheckbox = (dialog: HTMLElement) =>
    within(dialog).queryByRole('checkbox', { name: /use the area drawn on the map/i })

  it('offers the drawn area, ticked, with an outline thumbnail and its size', async () => {
    const user = userEvent.setup()
    drawAreaEarlier()
    const dialog = await openRunWorkflow(user)
    await chooseWorkflow(user, dialog, 'Area mask')
    await heading(dialog, /check the inputs/i)

    expect(useAreaCheckbox(dialog)).toBeChecked()
    expect(within(dialog).getByRole('img', { name: /area/i })).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/\d[\d,.]*\s*(km²|km2|sq\.? ?km|ha\b|hectares)/i)
  })

  it('sends the drawn area with each job', async () => {
    const user = userEvent.setup()
    drawAreaEarlier()
    const dialog = await openRunWorkflow(user)
    await chooseWorkflow(user, dialog, 'Area mask')
    await toReview(user, dialog)
    await user.click(runButton(dialog)!)

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(3))
    for (let index = 0; index < 3; index++) {
      expect(JSON.parse(String(sentVariables(index).aoi))).toMatchObject({
        geometry: aoi.geometry,
      })
    }
  })

  it('leaves out the area when the user unticks it', async () => {
    const user = userEvent.setup()
    drawAreaEarlier()
    const dialog = await openRunWorkflow(user)
    await chooseWorkflow(user, dialog, 'Optional clip')
    await heading(dialog, /check the inputs/i)
    await user.click(useAreaCheckbox(dialog)!)
    await toReview(user, dialog)
    await user.click(runButton(dialog)!)

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(3))
    expect(sentVariables(0)).not.toHaveProperty('aoi')
  })

  it('blocks a required area input with no drawn area and links to the set on the map', async () => {
    const user = userEvent.setup()
    const dialog = await openRunWorkflow(user)
    await chooseWorkflow(user, dialog, 'Area mask')

    expect(await within(dialog).findByText(/needs an area/i)).toBeInTheDocument()
    expect(
      within(dialog).queryByRole('link', { name: /open .*on (the )?map/i }) ??
        within(dialog).queryByRole('button', { name: /open .*on (the )?map/i }),
    ).not.toBeNull()

    const next = within(dialog).queryByRole('button', { name: 'Next' })
    if (next && !next.hasAttribute('disabled')) {
      await user.click(next)
      await heading(dialog, /review/i)
    }
    const run = runButton(dialog)
    if (run) {
      expect(run).toBeDisabled()
      await user.click(run)
    }
    expect(launchWorkflow).not.toHaveBeenCalled()
  })

  it('runs an optional area input on the full scene, and says so on the review step', async () => {
    const user = userEvent.setup()
    const dialog = await openRunWorkflow(user)
    await chooseWorkflow(user, dialog, 'Optional clip')
    await toReview(user, dialog)

    expect(dialog).toHaveTextContent(/full scene/i)
    expect(runButton(dialog)).toBeEnabled()
    await user.click(runButton(dialog)!)
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(3))
    for (let index = 0; index < 3; index++) {
      expect(sentVariables(index)).not.toHaveProperty('aoi')
    }
  })

  it('shows date pickers for date and date-range inputs, and sends the dates', async () => {
    const user = userEvent.setup()
    const dialog = await openRunWorkflow(user)
    await chooseWorkflow(user, dialog, 'Composite')
    await heading(dialog, /check the inputs/i)

    const start = within(dialog).getByLabelText('Start date')
    expect(start).toHaveAttribute('type', 'date')
    const dateFields = Array.from(dialog.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    expect(dateFields.length).toBeGreaterThanOrEqual(3)
    const [periodStart, periodEnd] = dateFields.filter((field) => field !== start)

    fireEvent.change(start, { target: { value: '2025-06-01' } })
    fireEvent.change(periodStart, { target: { value: '2025-06-01' } })
    fireEvent.change(periodEnd, { target: { value: '2025-06-30' } })
    await toReview(user, dialog)
    await user.click(runButton(dialog)!)

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(3))
    const variables = sentVariables(0)
    expect(variables.start).toBe('2025-06-01')
    expect(String(variables.period)).toContain('2025-06-01')
    expect(String(variables.period)).toContain('2025-06-30')
  })
})
