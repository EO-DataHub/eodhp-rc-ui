import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Item } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems as fetchCatalogue } from '@/services/processCatalogueService'
import { fetchItems as searchItems } from '@/services/itemService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchSavedSet, fetchSavedSets } from '@/services/savedSetsService'
import { PAGE_SIZE } from '@/hooks/useItemsQuery'
import PinnedItemsTab from '@/components/SidePanel/Tabs/PinnedItems'
import { item, listRecord, ndviWorkflow, stubBrowserGlobals } from '@/test-data/runWorkflow'
import {
  clearPins,
  fanOutItem,
  fanOutItemHref,
  fanOutItems,
  fanOutWorkflows,
  pinItems,
  savedSet,
  sentinelCollection,
  sentItemLinks,
  setItem,
  stubPointerApis,
  summaryOf,
  workspaceCollection,
} from '@/test-data/runWorkflowFanOut'
import { withProviders } from '@/test-data/runWorkflowRender'
import { RunWorkflowDialog } from './RunWorkflowDialog'

// Small limits, so the tests need few items and show the dialog reads them from the config module
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
// The pinned cards have their own buttons; these tests check the tab's Run workflow button
vi.mock('@/components/ItemCard/ItemCard', () => ({
  default: ({ item: card }: { item: Item }) => <p>{card.id}</p>,
}))

type User = ReturnType<typeof userEvent.setup>

/** Opens the dialog from the Pinned Items tab's Run workflow button. */
const openFromPinned = async (user: User) => {
  render(withProviders(<PinnedItemsTab />))
  await user.click(screen.getByRole('button', { name: 'Run workflow' }))
  return screen.findByRole('dialog')
}

const openFromItem = () => {
  render(withProviders(<RunWorkflowDialog open onOpenChange={vi.fn()} item={item} />))
  return screen.findByRole('dialog')
}

const heading = (dialog: HTMLElement, name: RegExp) =>
  within(dialog).findByRole('heading', { name })

const clickNext = (user: User, dialog: HTMLElement) =>
  user.click(within(dialog).getByRole('button', { name: 'Next' }))

/** Picks a workflow on the workflow step and moves on. */
const chooseWorkflow = async (user: User, dialog: HTMLElement, title: string) => {
  await heading(dialog, /choose a workflow/i)
  await user.click(await within(dialog).findByText(title))
  await clickNext(user, dialog)
}

/** Picks a workflow and goes to the review step, through the inputs step when there is one. */
const toReview = async (user: User, dialog: HTMLElement, title: string) => {
  await chooseWorkflow(user, dialog, title)
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

const runButton = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: /^run\b/i })

/** Goes back from the first step shown to the source step. */
const backToSource = async (user: User, dialog: HTMLElement) => {
  await user.click(within(dialog).getByRole('button', { name: /^(back|change source|change)$/i }))
  await heading(dialog, /what do you want to run on/i)
}

/** A source choice on the source step. */
const sourceOption = (dialog: HTMLElement, name: RegExp) =>
  within(dialog).queryByRole('radio', { name }) ?? within(dialog).getByRole('button', { name })

const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') ||
  element.getAttribute('aria-disabled') === 'true' ||
  element.hasAttribute('data-disabled')

const pickSavedSet = async (user: User, dialog: HTMLElement, name: string) => {
  await user.click(sourceOption(dialog, /saved set/i))
  const picker = within(dialog).queryByRole('combobox')
  if (picker) {
    await user.click(picker)
    await user.click(await screen.findByRole('option', { name }))
  } else {
    await user.click(await within(dialog).findByText(name))
  }
}

const launches = () => vi.mocked(launchWorkflow).mock.calls

/** Text in one element that says how many items are private. */
const privateCountMessage = (count: number) =>
  screen.queryAllByText(
    (_, element) =>
      !!element &&
      /private/i.test(element.textContent ?? '') &&
      new RegExp(`\\b${count}\\b`).test(element.textContent ?? '') &&
      Array.from(element.children).every((child) => !/private/i.test(child.textContent ?? '')),
  )

const resultItems = fanOutItems(PAGE_SIZE + 1, 'S2A_RESULT')
const set = savedSet([setItem('S2A_SET_1'), setItem('S2A_SET_2'), setItem('S2A_SET_3')])

beforeAll(() => {
  // setupTests.ts stubs URL; item links need the real one
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubBrowserGlobals()
  stubPointerApis()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  clearPins()
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'storeAoi', aoi: undefined })
  dataFinderStore.send({ type: 'setCollection', collection: sentinelCollection })
  dataFinderStore.send({ type: 'queryFilterChange', queryFilter: { limit: 100 } })

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
  vi.mocked(searchItems).mockResolvedValue(resultItems)
  vi.mocked(fetchSavedSets).mockResolvedValue([summaryOf(set)])
  vi.mocked(fetchSavedSet).mockResolvedValue(set)
  vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as never)
  let jobNumber = 0
  vi.mocked(launchWorkflow).mockImplementation(() => {
    jobNumber += 1
    return Promise.resolve({
      workflowId: `job-${jobNumber}`,
      status: 'accepted',
      submittedAt: '2026-11-02T10:00:00Z',
    })
  })
})

afterEach(() => {
  clearPins()
  dataFinderStore.send({ type: 'clearTool' })
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Stage 1: Run workflow on pinned items', () => {
  it('opens the dialog with the pinned items as the source, at the workflow step', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3))
    const dialog = await openFromPinned(user)
    await heading(dialog, /choose a workflow/i)
    expect(
      within(dialog).queryByRole('heading', { name: /what do you want to run on/i }),
    ).toBeNull()
    expect(dialog).toHaveTextContent(/pinned items/i)
  })

  it('lists every workflow, including those for other datasets', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3))
    const dialog = await openFromPinned(user)
    expect(await within(dialog).findByText('Landsat surface temperature')).toBeInTheDocument()
    expect(within(dialog).getByText('NDVI')).toBeInTheDocument()
    expect(within(dialog).getByText('Footprint')).toBeInTheDocument()
  })

  it('shows the number of jobs on the review step', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3))
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'NDVI')
    expect(dialog).toHaveTextContent(/\b3 jobs\b/i)
  })

  it('submits one job per pinned item, each with its own item link', async () => {
    const user = userEvent.setup()
    const items = fanOutItems(3)
    pinItems(items)
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'NDVI')
    await user.click(runButton(dialog))

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(3))
    expect(new Set(sentItemLinks(launches()))).toEqual(
      new Set(items.map((pinned) => fanOutItemHref(pinned.id))),
    )
    for (const call of launches()) {
      expect(String((call[1] as Record<string, unknown>).threshold)).toBe('0.3')
      expect(call[2]).toBe('ws-token')
    }
  })

  it('shows how many jobs started and links to Workflow outputs filtered to the workflow', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3))
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'NDVI')
    await user.click(runButton(dialog))

    expect(await within(dialog).findByText(/\b3 jobs started\b/i)).toBeInTheDocument()
    const outputsLink = within(dialog)
      .getAllByRole('link')
      .find((link) => link.getAttribute('href')?.startsWith('/my-data/workflow-outputs'))
    expect(outputsLink?.getAttribute('href')).toMatch(
      /^\/my-data\/workflow-outputs\?(.*&)?workflow=ndvi(&|$)/,
    )
  })

  it('opens with the workflow chosen in the Data Finder filled in', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3))
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    const dialog = await openFromPinned(user)
    await heading(dialog, /check the inputs/i)
    expect(within(dialog).queryByRole('heading', { name: /choose a workflow/i })).toBeNull()
    expect(dialog).toHaveTextContent('NDVI')
    expect(dialog).toHaveTextContent(/pinned items/i)
  })
})

describe('Stage 1: Changing the source', () => {
  it('offers this item, and disables pinned items with a reason when nothing is pinned', async () => {
    const user = userEvent.setup()
    const dialog = await openFromItem()
    await heading(dialog, /choose a workflow/i)
    await backToSource(user, dialog)

    expect(isDisabled(sourceOption(dialog, /this item/i))).toBe(false)
    expect(isDisabled(sourceOption(dialog, /pinned items/i))).toBe(true)
    expect(dialog).toHaveTextContent('Pin some items on the map first')
    expect(sourceOption(dialog, /saved set/i)).toBeInTheDocument()
    expect(sourceOption(dialog, /all results/i)).toBeInTheDocument()
  })

  it('disables this item when the dialog was opened without one', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    const dialog = await openFromPinned(user)
    await heading(dialog, /choose a workflow/i)
    await backToSource(user, dialog)
    expect(isDisabled(sourceOption(dialog, /this item/i))).toBe(true)
    expect(isDisabled(sourceOption(dialog, /pinned items/i))).toBe(false)
  })

  it('changes to pinned items from an item', async () => {
    const user = userEvent.setup()
    const items = fanOutItems(2)
    pinItems(items)
    const dialog = await openFromItem()
    await heading(dialog, /choose a workflow/i)
    await backToSource(user, dialog)
    await user.click(sourceOption(dialog, /pinned items/i))
    await clickNext(user, dialog)
    await toReview(user, dialog, 'Footprint')
    expect(dialog).toHaveTextContent(/\b2 jobs\b/i)
    await user.click(runButton(dialog))

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(2))
    expect(new Set(sentItemLinks(launches()))).toEqual(
      new Set(items.map((pinned) => fanOutItemHref(pinned.id))),
    )
  })

  it('changes to all results, filters the workflows by dataset and runs on every result', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    const dialog = await openFromPinned(user)
    await heading(dialog, /choose a workflow/i)
    await backToSource(user, dialog)
    await user.click(sourceOption(dialog, /all results/i))
    await clickNext(user, dialog)

    expect(await within(dialog).findByText('NDVI')).toBeInTheDocument()
    expect(within(dialog).queryByText('Landsat surface temperature')).toBeNull()
    await toReview(user, dialog, 'Footprint')
    expect(dialog).toHaveTextContent(new RegExp(`\\b${resultItems.length} jobs\\b`, 'i'))
    await user.click(runButton(dialog))

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(resultItems.length))
    expect(new Set(sentItemLinks(launches()))).toEqual(
      new Set(resultItems.map((result) => fanOutItemHref(result.id))),
    )
  })

  it('changes to a saved set and runs on each item in the set', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(2))
    const dialog = await openFromPinned(user)
    await heading(dialog, /choose a workflow/i)
    await backToSource(user, dialog)
    await pickSavedSet(user, dialog, 'Coastal set')
    await clickNext(user, dialog)

    expect(await within(dialog).findByText('Landsat surface temperature')).toBeInTheDocument()
    await toReview(user, dialog, 'Footprint')
    expect(dialog).toHaveTextContent(/\b3 jobs\b/i)
    await user.click(runButton(dialog))

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(3))
    expect(new Set(sentItemLinks(launches()))).toEqual(
      new Set(set.items.map((entry) => entry.selfHref)),
    )
  })
})

describe('Stage 1: Fan-out submission', () => {
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
            resolve({ workflowId: 'job', status: 'accepted', submittedAt: '' })
          })
        }),
    )
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')
    await user.click(runButton(dialog))

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
    expect(await within(dialog).findByText(/\b6 jobs started\b/i)).toBeInTheDocument()
  })

  it('reports the jobs that failed to start, with each item and its error', async () => {
    const user = userEvent.setup()
    const items = fanOutItems(3)
    pinItems(items)
    vi.mocked(launchWorkflow).mockImplementation((_url, variables) =>
      variables.stac_item === fanOutItemHref('S2A_FAN_2')
        ? Promise.reject(new Error('Quota exceeded'))
        : Promise.resolve({ workflowId: 'job', status: 'accepted', submittedAt: '' }),
    )
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')
    await user.click(runButton(dialog))

    expect(await within(dialog).findByText(/\b2 jobs started\b/i)).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/\b1 failed to start\b/i)
    expect(dialog).toHaveTextContent('S2A_FAN_2')
    expect(dialog).toHaveTextContent('Quota exceeded')
    expect(within(dialog).getByRole('button', { name: 'Retry these' })).toBeInTheDocument()
  })

  it('resubmits only the failed items on Retry these', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3))
    let failed = false
    vi.mocked(launchWorkflow).mockImplementation((_url, variables) => {
      if (variables.stac_item === fanOutItemHref('S2A_FAN_2') && !failed) {
        failed = true
        return Promise.reject(new Error('Quota exceeded'))
      }
      return Promise.resolve({ workflowId: 'job', status: 'accepted', submittedAt: '' })
    })
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')
    await user.click(runButton(dialog))
    await user.click(await within(dialog).findByRole('button', { name: 'Retry these' }))

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(4))
    expect(sentItemLinks(launches()).slice(3)).toEqual([fanOutItemHref('S2A_FAN_2')])
    await waitFor(() =>
      expect(within(dialog).queryByRole('button', { name: 'Retry these' })).toBeNull(),
    )
    expect(dialog).not.toHaveTextContent('Quota exceeded')
  })
})

describe('Stage 2: Item limit', () => {
  const confirmBox = (dialog: HTMLElement) => within(dialog).queryByRole('checkbox')

  it('asks for no confirmation at the limit', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(CONFIRM_JOBS_ABOVE))
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')
    expect(confirmBox(dialog)).toBeNull()
    expect(runButton(dialog)).toBeEnabled()
  })

  it('shows the number of jobs and needs a ticked box above the limit', async () => {
    const user = userEvent.setup()
    const count = CONFIRM_JOBS_ABOVE + 1
    pinItems(fanOutItems(count))
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')

    expect(dialog).toHaveTextContent(new RegExp(`\\b${count} jobs\\b`, 'i'))
    expect(runButton(dialog)).toBeDisabled()
    await user.click(confirmBox(dialog)!)
    expect(runButton(dialog)).toBeEnabled()
    await user.click(runButton(dialog))
    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(count))
  })

  it('allows a run of exactly the ceiling once confirmed', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(MAX_JOBS_PER_RUN))
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')
    await user.click(confirmBox(dialog)!)
    expect(runButton(dialog)).toBeEnabled()
  })

  it('blocks a run above the ceiling and says what the ceiling is', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(MAX_JOBS_PER_RUN + 1))
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')

    expect(dialog).toHaveTextContent(new RegExp(`\\b${MAX_JOBS_PER_RUN}\\b`))
    const box = confirmBox(dialog)
    if (box && !isDisabled(box)) await user.click(box)
    expect(runButton(dialog)).toBeDisabled()
    await user.click(runButton(dialog))
    expect(launchWorkflow).not.toHaveBeenCalled()
  })
})

describe('Stage 2: Private data', () => {
  const pinMixedItems = () => {
    pinItems(fanOutItems(3))
    pinItems([fanOutItem('MY_UPLOAD_1')], { isUserCollection: true })
    pinItems([fanOutItem('PURCHASED_1', { collection: 'purchased_s2' })], {
      collection: workspaceCollection,
    })
  }

  it('runs on private items when the item input uses stage-in', async () => {
    const user = userEvent.setup()
    pinMixedItems()
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'NDVI')
    expect(privateCountMessage(2)).toHaveLength(0)
    expect(runButton(dialog)).toBeEnabled()
  })

  it('blocks the run and counts the private items when the input has no stage-in', async () => {
    const user = userEvent.setup()
    pinMixedItems()
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')

    expect(privateCountMessage(2).length).toBeGreaterThan(0)
    expect(runButton(dialog)).toBeDisabled()
    await user.click(runButton(dialog))
    expect(launchWorkflow).not.toHaveBeenCalled()
  })

  it('runs on public items when the input has no stage-in', async () => {
    const user = userEvent.setup()
    pinItems(fanOutItems(3))
    const dialog = await openFromPinned(user)
    await toReview(user, dialog, 'Footprint')
    expect(dialog).not.toHaveTextContent(/private/i)
    expect(runButton(dialog)).toBeEnabled()
  })
})
