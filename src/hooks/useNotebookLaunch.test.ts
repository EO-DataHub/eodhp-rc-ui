import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProcessDetail, ProcessRecord } from '@/types'
import { fetchItemById, fetchItems } from '@/services/processCatalogueService'
import { launchNotebook } from '@/services/notebookLaunchService'
import { isPinSetNotebook } from '@/services/notebookVariableResolvers'
import { useNotebookLaunch, type UseNotebookLaunchParams } from './useNotebookLaunch'

vi.mock('@/services/processCatalogueService', () => ({
  fetchItems: vi.fn(),
  fetchItemById: vi.fn(),
}))
vi.mock('@/services/notebookLaunchService', () => ({ launchNotebook: vi.fn() }))

const record = (id: string, inputParameters: Record<string, object>): ProcessDetail => ({
  id,
  type: 'Feature',
  properties: { type: 'notebook', title: id, description: null, inputParameters },
  links: [{ rel: 'application', href: `https://notebooks.example/${id}.ipynb` }],
})

const itemNotebook = record('ndvi', { STAC_ITEM_LINK: {} })
const setNotebook = record('pin_set_starter', {
  PIN_SET_ID: {},
  PIN_SET_NAME: {},
  WORKSPACE_NAME: {},
})

const isItemNotebook = (r: ProcessRecord) => !isPinSetNotebook(r)
const pinSet = {
  id: 'set-1',
  name: 'Floods',
  workspace: 'my-ws',
  apiBaseUrl: 'https://hub.example',
}

const params = (overrides: Partial<UseNotebookLaunchParams> = {}): UseNotebookLaunchParams => ({
  enabled: true,
  filterNotebooks: isPinSetNotebook,
  autoSelectSingle: true,
  context: { pinSet },
  token: 'token',
  currentWorkspace: 'my-ws',
  username: 'alice',
  ...overrides,
})

let tab: { opener: unknown; location: { href: string }; close: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.mocked(fetchItems).mockResolvedValue({
    data: { items: [itemNotebook, setNotebook] } as never,
    error: null,
  })
  vi.mocked(fetchItemById).mockImplementation((id) =>
    Promise.resolve({
      data: id === setNotebook.id ? setNotebook : itemNotebook,
      error: null,
      notFound: false,
    }),
  )
  vi.mocked(launchNotebook).mockResolvedValue('https://hub.example/spawn')
  tab = {
    opener: {},
    location: { href: '' },
    close: vi.fn(),
  }
  vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('useNotebookLaunch', () => {
  it('lists only set notebooks for a set, and selects the only one', async () => {
    const { result } = renderHook(() => useNotebookLaunch(params()))
    await waitFor(() => expect(result.current.notebooks).toEqual([setNotebook]))
    expect(result.current.selectedNotebook).toBe(setNotebook)
  })

  it('never lists set notebooks for an item', async () => {
    const { result } = renderHook(() =>
      useNotebookLaunch(
        params({
          applicableCollections: 'sentinel2_ard',
          filterNotebooks: isItemNotebook,
          autoSelectSingle: false,
        }),
      ),
    )
    await waitFor(() => expect(result.current.notebooks).toEqual([itemNotebook]))
    expect(result.current.selectedNotebook).toBeNull()
    expect(fetchItems).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'notebook', applicableCollections: 'sentinel2_ard' }),
    )
  })

  it('does not fetch when disabled', () => {
    renderHook(() => useNotebookLaunch(params({ enabled: false })))
    expect(fetchItems).not.toHaveBeenCalled()
  })

  it('launches with the set variables and sends the pending tab to the spawn URL', async () => {
    const { result } = renderHook(() => useNotebookLaunch(params()))
    await waitFor(() => expect(result.current.selectedNotebook).not.toBeNull())

    await act(() => result.current.launch())

    expect(launchNotebook).toHaveBeenCalledWith(
      {
        workspace_name: 'my-ws',
        username: 'alice',
        action_name: 'pin_set_starter',
        template_url: 'https://notebooks.example/pin_set_starter.ipynb',
        variables: { PIN_SET_ID: 'set-1', PIN_SET_NAME: 'Floods', WORKSPACE_NAME: 'my-ws' },
      },
      'token',
    )
    expect(window.open).toHaveBeenCalledTimes(1)
    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(tab.opener).toBeNull()
    expect(tab.location.href).toBe('https://hub.example/spawn')
    expect(result.current.launchError).toBeNull()
  })

  it('closes the pending tab and shows the error when the launch fails', async () => {
    vi.mocked(launchNotebook).mockRejectedValue(new Error('Failed to save notebook.'))
    const { result } = renderHook(() => useNotebookLaunch(params()))
    await waitFor(() => expect(result.current.selectedNotebook).not.toBeNull())

    await act(() => result.current.launch())

    expect(tab.close).toHaveBeenCalled()
    expect(result.current.launchError).toBe('Failed to save notebook.')
  })

  it('refuses to launch a notebook whose required variables the context cannot fill', async () => {
    const { result } = renderHook(() =>
      useNotebookLaunch(params({ context: { item: undefined, aoi: null } })),
    )
    await waitFor(() => expect(result.current.selectedNotebook).not.toBeNull())

    await act(() => result.current.launch())

    expect(launchNotebook).not.toHaveBeenCalled()
    expect(tab.close).toHaveBeenCalled()
    expect(result.current.launchError).toMatch(/Missing required data/)
  })

  it('falls back to opening the spawn URL when the pending tab was blocked', async () => {
    vi.mocked(window.open).mockReturnValue(null)
    const { result } = renderHook(() => useNotebookLaunch(params()))
    await waitFor(() => expect(result.current.selectedNotebook).not.toBeNull())

    await act(() => result.current.launch())

    expect(window.open).toHaveBeenLastCalledWith('https://hub.example/spawn', '_blank')
  })
})
