import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessDetail } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import {
  allWorkflows,
  anyDatasetWorkflow,
  aoi,
  areaWorkflow,
  item,
  ITEM_SELF_HREF,
  itemWithoutLink,
  legacyWorkflow,
  listRecord,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import { RunWorkflowDialog } from './RunWorkflowDialog'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/workflowLaunchService', () => ({ launchWorkflow: vi.fn() }))
vi.mock('@/services/workspaceTokenService', () => ({ fetchWorkspaceTokens: vi.fn() }))

type DialogProps = Partial<React.ComponentProps<typeof RunWorkflowDialog>>
type AuthValue = React.ContextType<typeof AuthenticationContext>

const auth = (overrides: Partial<AuthValue> = {}): AuthValue => ({
  isAuthenticated: true,
  isAuthenticating: false,
  isAuthenticationServiceError: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  token: 'token',
  userInfo: { preferred_username: 'alice' },
  currentWorkspace: 'my-ws',
  updateCurrentWorkspace: vi.fn(),
  clearCurrentWorkspace: vi.fn(),
  ...overrides,
})

const dialogTree = (props: DialogProps = {}, authOverrides: Partial<AuthValue> = {}) => (
  <MemoryRouter>
    <AuthenticationContext.Provider value={auth(authOverrides)}>
      <RunWorkflowDialog open onOpenChange={vi.fn()} {...props} />
    </AuthenticationContext.Provider>
  </MemoryRouter>
)

const renderDialog = (props: DialogProps = {}, authOverrides: Partial<AuthValue> = {}) =>
  render(dialogTree(props, authOverrides))

const heading = (name: RegExp) => screen.findByRole('heading', { name })
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }))
const back = () => fireEvent.click(screen.getByRole('button', { name: 'Back' }))
const runButton = () => screen.getByRole('button', { name: /^run\b/i })
const aoiCheckbox = () => screen.queryByRole('checkbox', { name: /include area of interest/i })
const sentVariables = () => vi.mocked(launchWorkflow).mock.calls[0][1]
const fieldValue = (label: string) => screen.getByLabelText<HTMLInputElement>(label).value

/** A Hub input is shown, but not as a field the user can change. */
const expectNotEditable = (label: string) => {
  const field = screen.queryByLabelText(label)
  if (field) expect(field.hasAttribute('readonly') || field.hasAttribute('disabled')).toBe(true)
}

const chooseWorkflow = async (title: string) => {
  await heading(/choose a workflow/i)
  fireEvent.click(await screen.findByText(title))
  next()
  await heading(/check the inputs/i)
}

const toReview = async () => {
  next()
  await heading(/review/i)
}

const drawArea = () => dataFinderStore.send({ type: 'storeAoi', aoi })

beforeEach(() => {
  stubBrowserGlobals()
  vi.stubEnv('VITE_HUB_BASE_URL', 'https://hub.example')
  vi.stubEnv('VITE_WORKFLOW_RESULTS_WORKSPACE_NAME', 'wf-ws')
  dataFinderStore.send({ type: 'storeAoi', aoi: undefined })

  vi.mocked(fetchItems).mockResolvedValue({
    data: { items: allWorkflows.map(listRecord) } as never,
    error: null,
  })
  vi.mocked(fetchItemById).mockImplementation((id) =>
    Promise.resolve({
      data: allWorkflows.find((w) => w.id === id)!,
      error: null,
      notFound: false,
    }),
  )
  vi.mocked(fetchWorkspaceTokens).mockResolvedValue({ access: 'ws-token' } as never)
  vi.mocked(launchWorkflow).mockResolvedValue({
    workflowId: 'job-123',
    status: 'accepted',
    submittedAt: '2026-10-29T10:00:00Z',
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('RunWorkflowDialog from an item', () => {
  it('skips the source step and starts at the workflow step for this item', async () => {
    renderDialog({ item })
    await heading(/choose a workflow/i)
    expect(screen.queryByRole('heading', { name: /what do you want to run on/i })).toBeNull()
    expect(screen.getAllByText(new RegExp(item.id)).length).toBeGreaterThan(0)
  })

  it("lists the workflows for the item's dataset and those for any dataset", async () => {
    renderDialog({ item })
    expect(await screen.findByText('NDVI')).toBeInTheDocument()
    expect(screen.getByText('Clip')).toBeInTheDocument()
    expect(screen.getByText('Footprint')).toBeInTheDocument()
    expect(screen.queryByText('Landsat surface temperature')).toBeNull()
  })

  it('shows the description of each workflow', async () => {
    renderDialog({ item })
    expect(await screen.findByText('Calculates NDVI for one Sentinel-2 item.')).toBeInTheDocument()
    expect(screen.getByText('Clips an item to an area.')).toBeInTheDocument()
    expect(screen.getByText('Works on items from any dataset.')).toBeInTheDocument()
  })

  it('goes from the workflow to the inputs to the review', async () => {
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    await toReview()
    back()
    await heading(/check the inputs/i)
    back()
    await heading(/choose a workflow/i)
  })

  it('shows Hub inputs read-only with their value', async () => {
    drawArea()
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    expect(screen.getByText('STAC item')).toBeInTheDocument()
    expect(screen.getByText('Area of interest')).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(item.id)).length).toBeGreaterThan(0)
    expect(screen.getByText(/the area drawn on the map/i)).toBeInTheDocument()
    expectNotEditable('STAC item')
    expectNotEditable('Area of interest')
  })

  it("shows inputs the user fills in as fields with the record's default", async () => {
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    expect(fieldValue('Threshold')).toBe('0.3')
  })

  it('ticks Include area of interest when an area is drawn', async () => {
    drawArea()
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    expect(aoiCheckbox()).toBeChecked()
  })

  it('does not tick Include area of interest when no area is drawn', async () => {
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    const checkbox = aoiCheckbox()
    if (checkbox) expect(checkbox).not.toBeChecked()
  })

  it('shows the workflow, item, inputs and workspace on the review step', async () => {
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    fireEvent.change(screen.getByLabelText('Threshold'), { target: { value: '0.5' } })
    await toReview()
    expect(screen.getAllByText(/NDVI/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(item.id)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Threshold/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/0\.5/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/my-ws/).length).toBeGreaterThan(0)
  })

  it('runs with the Hub values, the area and the user values', async () => {
    drawArea()
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    await toReview()
    fireEvent.click(runButton())

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(1))
    expect(fetchWorkspaceTokens).toHaveBeenCalledWith('my-ws', 'token')
    expect(vi.mocked(launchWorkflow).mock.calls[0][2]).toBe('ws-token')
    const variables = sentVariables()
    expect(variables).toMatchObject({ stac_item: ITEM_SELF_HREF, aoi: JSON.stringify(aoi) })
    expect(String(variables.threshold)).toBe('0.3')
  })

  it('leaves out the area when Include area of interest is unticked', async () => {
    drawArea()
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    fireEvent.click(aoiCheckbox()!)
    expect(aoiCheckbox()).not.toBeChecked()
    await toReview()
    fireEvent.click(runButton())

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(1))
    expect(sentVariables()).not.toHaveProperty('aoi')
    expect(sentVariables()).toMatchObject({ stac_item: ITEM_SELF_HREF })
  })

  it('resolves inputs with no Hub type by their variableRef', async () => {
    drawArea()
    renderDialog({ item })
    await chooseWorkflow(legacyWorkflow.properties.title)
    expectNotEditable('Item link')
    expectNotEditable('Bounding box')
    await toReview()
    fireEvent.click(runButton())

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(1))
    expect(sentVariables()).toEqual({ stac_item: ITEM_SELF_HREF, bbox: JSON.stringify(aoi) })
  })

  it('disables Run and asks for a workspace when none is selected', async () => {
    renderDialog({ item }, { currentWorkspace: undefined })
    await chooseWorkflow('NDVI')
    await toReview()
    expect(runButton()).toBeDisabled()
    expect(screen.getByText(/select a workspace/i)).toBeInTheDocument()
    fireEvent.click(runButton())
    expect(launchWorkflow).not.toHaveBeenCalled()
  })

  it('links to the job in Workflow outputs after a run', async () => {
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    await toReview()
    fireEvent.click(runButton())

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('link')
          .some((link) =>
            link.getAttribute('href')?.includes('/my-data/workflow-outputs/my-ws/job-123'),
          ),
      ).toBe(true),
    )
  })

  it('disables Run and sends no job when the item has no self link', async () => {
    renderDialog({ item: itemWithoutLink })
    await chooseWorkflow('NDVI')
    await toReview()
    expect(runButton()).toBeDisabled()
    expect(screen.getByText(/this item has no link/i)).toBeInTheDocument()
    fireEvent.click(runButton())
    expect(fetchWorkspaceTokens).not.toHaveBeenCalled()
    expect(launchWorkflow).not.toHaveBeenCalled()
  })

  it('ignores a workflow details response from an earlier opening', async () => {
    let respond: (record: ProcessDetail) => void = () => undefined
    vi.mocked(fetchItemById).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = (record) => resolve({ data: record, error: null, notFound: false })
        }),
    )
    const { rerender } = renderDialog({ item })
    await heading(/choose a workflow/i)
    fireEvent.click(await screen.findByText('NDVI'))
    next()
    await waitFor(() => expect(fetchItemById).toHaveBeenCalledWith('ndvi'))

    rerender(dialogTree({ item, open: false }))
    rerender(dialogTree({ item, open: true }))
    await heading(/choose a workflow/i)

    await act(() => Promise.resolve(respond(ndviWorkflow)))
    expect(screen.getByRole('heading', { name: /choose a workflow/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /check the inputs/i })).toBeNull()
    expect(screen.queryByLabelText('Threshold')).toBeNull()
  })

  it('shows the launch error and keeps the inputs', async () => {
    vi.mocked(launchWorkflow).mockRejectedValueOnce(
      new Error('Insufficient permissions to launch this workflow.'),
    )
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    fireEvent.change(screen.getByLabelText('Threshold'), { target: { value: '0.5' } })
    await toReview()
    fireEvent.click(runButton())

    expect(
      await screen.findByText('Insufficient permissions to launch this workflow.'),
    ).toBeInTheDocument()
    back()
    await heading(/check the inputs/i)
    expect(fieldValue('Threshold')).toBe('0.5')
  })
})

describe('RunWorkflowDialog from an item and a workflow', () => {
  it('starts at the inputs step with both filled in', async () => {
    renderDialog({ item, workflow: ndviWorkflow })
    await heading(/check the inputs/i)
    expect(screen.queryByRole('heading', { name: /choose a workflow/i })).toBeNull()
    expect(screen.queryByRole('heading', { name: /what do you want to run on/i })).toBeNull()
    expect(screen.getAllByText(/NDVI/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(item.id)).length).toBeGreaterThan(0)
  })

  it('runs the workflow on the item', async () => {
    renderDialog({ item, workflow: ndviWorkflow })
    await heading(/check the inputs/i)
    await toReview()
    fireEvent.click(runButton())

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(1))
    expect(sentVariables()).toMatchObject({ stac_item: ITEM_SELF_HREF })
  })

  it('keeps the tool chosen in the Data Finder after a run', async () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    renderDialog({ item, workflow: ndviWorkflow })
    await heading(/check the inputs/i)
    await toReview()
    fireEvent.click(runButton())

    await waitFor(() => expect(launchWorkflow).toHaveBeenCalledTimes(1))
    await screen.findByText(/has started/i)
    expect(dataFinderStore.getSnapshot().context.chosenTool?.id).toBe('ndvi')
    dataFinderStore.send({ type: 'clearTool' })
  })
})

describe('RunWorkflowDialog inputs step', () => {
  const inputsHeading = () => screen.queryByRole('heading', { name: /check the inputs/i })

  it('is skipped when the workflow has no user fields and no area checkbox', async () => {
    renderDialog({ item })
    await heading(/choose a workflow/i)
    fireEvent.click(await screen.findByText('Footprint'))
    next()
    await heading(/review/i)
    expect(inputsHeading()).toBeNull()
    back()
    await heading(/choose a workflow/i)
  })

  it('is skipped from an item and a workflow when it has no user fields and no area checkbox', async () => {
    renderDialog({ item, workflow: anyDatasetWorkflow })
    await heading(/review/i)
    expect(inputsHeading()).toBeNull()
  })

  it('is shown when the workflow has an area checkbox', async () => {
    drawArea()
    renderDialog({ item })
    await chooseWorkflow(areaWorkflow.properties.title)
    expect(aoiCheckbox()).toBeInTheDocument()
  })

  it('is shown when the workflow has user fields', async () => {
    renderDialog({ item })
    await chooseWorkflow('NDVI')
    expect(screen.getByLabelText('Threshold')).toBeInTheDocument()
  })
})

describe('workflow-first source step', () => {
  it('removes the item picker hook', () => {
    expect(Object.keys(import.meta.glob('/src/hooks/useProcessLaunchFromCatalogue.ts'))).toEqual([])
  })
})

describe('old launch modals', () => {
  it('removes the item panel launch modal', () => {
    expect(Object.keys(import.meta.glob('/src/components/WorkflowLaunchModal/*.tsx'))).toEqual([])
  })

  it('removes the process catalogue launch modal', () => {
    expect(
      Object.keys(import.meta.glob('/src/components/ProcessCatalogue/ProcessLaunchModal.tsx')),
    ).toEqual([])
  })
})
