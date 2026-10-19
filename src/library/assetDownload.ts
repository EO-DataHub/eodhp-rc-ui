const IFRAME_LIFETIME_MS = 60_000

/**
 * Starts a browser download for each href by loading it in a hidden iframe, spaced out
 * so the browser doesn't drop them. Unlike clicking a link, this never navigates away
 * from the page. Returns a function that cancels the downloads not yet started.
 */
export const triggerStaggeredDownloads = (
  hrefs: string[],
  { intervalMs = 500 }: { intervalMs?: number } = {},
): (() => void) => {
  const startTimers = hrefs.map((href, index) =>
    setTimeout(() => {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = href
      document.body.appendChild(iframe)
      setTimeout(() => iframe.remove(), IFRAME_LIFETIME_MS)
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
