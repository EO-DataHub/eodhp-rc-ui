import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Item } from '@/types'
import { ItemDownloads } from './ItemDownloads'

vi.mock('@/assets/icons/download-filled.svg?react', () => ({ default: () => null }))
vi.mock('@/hooks/useWorkspaceToken', () => ({
  useWorkspaceToken: () => ({ data: { access: 'ws-token' } }),
}))
vi.mock('@/hooks/useGoogleAnalyticsActions', () => ({
  useAnalyticsActions: () => ({
    trackDownloadItemImagery: vi.fn(),
    trackDownloadAllItemImagery: vi.fn(),
    trackCopyDownloadScript: vi.fn(),
  }),
}))

const item = {
  id: 'S2A_20250601',
  collection: 'sentinel2_ard',
  links: [],
  assets: {
    a: { href: 'https://x.example/a.tif' },
    b: { href: 'https://x.example/b.tif' },
    c: { href: 'https://x.example/c.tif' },
    d: { href: 'https://x.example/d.tif' },
  },
} as unknown as Item

const startedDownloads = () => [...document.querySelectorAll('iframe')].map((frame) => frame.src)

const renderItemDownloads = (props: Partial<React.ComponentProps<typeof ItemDownloads>> = {}) =>
  render(
    <React.StrictMode>
      <MemoryRouter>
        <ItemDownloads item={item} isPrivate={false} {...props} />
      </MemoryRouter>
    </React.StrictMode>,
  )

describe('ItemDownloads', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
  })

  it('starts each download once when all assets are selected', () => {
    renderItemDownloads()
    fireEvent.click(screen.getByText('Download all (4)'))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(startedDownloads()).toEqual([
      'https://x.example/a.tif',
      'https://x.example/b.tif',
      'https://x.example/c.tif',
      'https://x.example/d.tif',
    ])
  })

  it('ignores a second click while downloads are starting', () => {
    renderItemDownloads()
    fireEvent.click(screen.getByText('Download all (4)'))
    fireEvent.click(screen.getByText('Starting downloads…'))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(startedDownloads()).toHaveLength(4)
    expect(screen.getByText('Download all (4)')).toBeEnabled()
  })

  it('starts each selected download once', () => {
    renderItemDownloads()
    fireEvent.click(screen.getByLabelText('Select b'))
    fireEvent.click(screen.getByText('Download selected (3)'))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(startedDownloads()).toEqual([
      'https://x.example/a.tif',
      'https://x.example/c.tif',
      'https://x.example/d.tif',
    ])
  })

  it('fetches workspace files with the token and loads other files without it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()) })
    // The token check parses hrefs, so use the real URL (setupTests.ts stubs it)
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', fetchMock)
    URL.createObjectURL = vi.fn(() => 'blob:file')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const privateItem = {
      ...item,
      assets: {
        data: { href: 'https://my-ws.eodatahub-workspaces.org.uk/files/data.tif' },
        quicklook: { href: 'https://third-party.example.com/quicklook.png' },
      },
    } as unknown as Item
    renderItemDownloads({ item: privateItem, isPrivate: true, workspace: 'my-ws' })

    fireEvent.click(screen.getByText('Download all (2)'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://my-ws.eodatahub-workspaces.org.uk/files/data.tif',
    )
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer ws-token' })
    expect(startedDownloads()).toEqual(['https://third-party.example.com/quicklook.png'])
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})
