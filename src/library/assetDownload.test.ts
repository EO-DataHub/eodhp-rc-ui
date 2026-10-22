import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browserDownloadHref, downloadWithToken, triggerStaggeredDownloads } from './assetDownload'

const iframes = () => document.querySelectorAll('iframe')

describe('browserDownloadHref', () => {
  // setupTests.ts stubs URL; this needs the real one
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks CEDA to send files as attachments', () => {
    expect(browserDownloadHref('https://dap.ceda.ac.uk/neodc/ard/thumb.jpg')).toBe(
      'https://dap.ceda.ac.uk/neodc/ard/thumb.jpg?download=1',
    )
  })

  it('keeps an existing query string', () => {
    expect(browserDownloadHref('https://dap.ceda.ac.uk/neodc/meta.xml?v=2')).toBe(
      'https://dap.ceda.ac.uk/neodc/meta.xml?v=2&download=1',
    )
  })

  it('leaves other hosts, including look-alikes, unchanged', () => {
    for (const href of [
      'https://eocis.org/data/thumb.jpg',
      'https://dap.ceda.ac.uk.example.com/thumb.jpg',
      'not a url',
    ]) {
      expect(browserDownloadHref(href)).toBe(href)
    }
  })
})

describe('triggerStaggeredDownloads', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
  })

  it('adds one hidden iframe per href, spaced out', () => {
    triggerStaggeredDownloads(['https://x.example/a', 'https://x.example/b'], { intervalMs: 500 })

    vi.advanceTimersByTime(0)
    expect(iframes()).toHaveLength(1)
    expect(iframes()[0].src).toBe('https://x.example/a')
    expect(iframes()[0].style.display).toBe('none')

    vi.advanceTimersByTime(500)
    expect(iframes()).toHaveLength(2)
  })

  it('removes the iframes after a minute', () => {
    triggerStaggeredDownloads(['https://x.example/a'])
    vi.advanceTimersByTime(0)
    expect(iframes()).toHaveLength(1)
    vi.advanceTimersByTime(60_000)
    expect(iframes()).toHaveLength(0)
  })

  it('calls onStarted once the last download has started', () => {
    const onStarted = vi.fn()
    triggerStaggeredDownloads(['https://x.example/a', 'https://x.example/b'], { onStarted })
    vi.advanceTimersByTime(0)
    expect(onStarted).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(onStarted).toHaveBeenCalledTimes(1)
  })

  it('cancels downloads that have not started', () => {
    const cancel = triggerStaggeredDownloads(['https://x.example/a', 'https://x.example/b'])
    vi.advanceTimersByTime(0)
    cancel()
    vi.advanceTimersByTime(1_000)
    expect(iframes()).toHaveLength(1)
  })
})

describe('downloadWithToken', () => {
  const clicked: { href: string; download: string }[] = []

  beforeEach(() => {
    clicked.length = 0
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ href: this.getAttribute('href') ?? '', download: this.download })
    })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:file', revokeObjectURL: vi.fn() })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('fetches each file with the token, in order, and saves it under its filename', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()) })
    vi.stubGlobal('fetch', fetchMock)
    const progress: number[] = []

    const failed = await downloadWithToken(
      [
        { href: 'https://ws.example/a.tif', filename: 'a.tif' },
        { href: 'https://ws.example/b.tif', filename: 'b.tif' },
      ],
      'secret',
      { onProgress: (done) => progress.push(done) },
    )

    expect(failed).toEqual([])
    expect(fetchMock.mock.calls.map(([href]) => href as string)).toEqual([
      'https://ws.example/a.tif',
      'https://ws.example/b.tif',
    ])
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer secret' })
    expect(clicked.map((c) => c.download)).toEqual(['a.tif', 'b.tif'])
    expect(progress).toEqual([0, 1, 2])
  })

  it('carries on after a failure and reports the failed files', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 403 })
        .mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) }),
    )

    const failed = await downloadWithToken(
      [
        { href: 'https://ws.example/a.tif', filename: 'a.tif' },
        { href: 'https://ws.example/b.tif', filename: 'b.tif' },
      ],
      'secret',
    )

    expect(failed.map((f) => f.filename)).toEqual(['a.tif'])
    expect(clicked.map((c) => c.download)).toEqual(['b.tif'])
  })

  it('stops when aborted', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort()
      return Promise.reject(new DOMException('Aborted', 'AbortError'))
    })
    vi.stubGlobal('fetch', fetchMock)

    const failed = await downloadWithToken(
      [
        { href: 'https://ws.example/a.tif', filename: 'a.tif' },
        { href: 'https://ws.example/b.tif', filename: 'b.tif' },
      ],
      'secret',
      { signal: controller.signal },
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(failed).toEqual([])
  })
})
