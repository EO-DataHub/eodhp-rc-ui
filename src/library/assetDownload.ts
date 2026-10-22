const IFRAME_LIFETIME_MS = 60_000

const CEDA_HOST = 'dap.ceda.ac.uk'

/**
 * The href to give the browser for a download. CEDA serves images and XML to display
 * inline, so they open in a tab (or show in the hidden iframe and never save); its
 * download=1 flag makes it send them as attachments.
 */
export const browserDownloadHref = (href: string): string => {
  try {
    const url = new URL(href)
    if (url.hostname.toLowerCase() !== CEDA_HOST) return href
    url.searchParams.set('download', '1')
    return url.href
  } catch {
    return href
  }
}

/**
 * Starts a browser download for each href by loading it in a hidden iframe, spaced out
 * so the browser doesn't drop them. Unlike clicking a link, this never navigates away
 * from the page. Calls onStarted once the last download has started. Returns a function
 * that cancels the downloads not yet started.
 */
export const triggerStaggeredDownloads = (
  hrefs: string[],
  { intervalMs = 500, onStarted }: { intervalMs?: number; onStarted?: () => void } = {},
): (() => void) => {
  if (hrefs.length === 0) onStarted?.()
  const startTimers = hrefs.map((href, index) =>
    setTimeout(() => {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = href
      document.body.appendChild(iframe)
      setTimeout(() => iframe.remove(), IFRAME_LIFETIME_MS)
      if (index === hrefs.length - 1) onStarted?.()
    }, index * intervalMs),
  )

  return () => startTimers.forEach((timer) => clearTimeout(timer))
}

export interface TokenDownload {
  href: string
  filename: string
}

/**
 * Downloads files one at a time with a workspace token, saving each from memory. Used for
 * workspace-hosted files: they sit behind a login redirect that a hidden iframe can't
 * follow, because the browser blocks the login cookies in a cross-site frame.
 * Returns the files that failed.
 */
export const downloadWithToken = async (
  files: TokenDownload[],
  token: string,
  {
    signal,
    onProgress,
  }: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<TokenDownload[]> => {
  const failed: TokenDownload[] = []

  for (const [index, file] of files.entries()) {
    if (signal?.aborted) break
    onProgress?.(index, files.length)
    try {
      const response = await fetch(file.href, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const objectUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = file.filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      // Give the browser time to start saving before freeing the memory
      setTimeout(() => URL.revokeObjectURL(objectUrl), IFRAME_LIFETIME_MS)
    } catch {
      if (signal?.aborted) break
      failed.push(file)
    }
  }

  onProgress?.(files.length, files.length)
  return failed
}
