const MAX_MESSAGE_LENGTH = 200

interface TileRequestError {
  status?: number
  statusText?: string
  body?: Blob
  message?: string
}

/** Reads titiler's `detail`, which is a string or a list of validation errors. */
async function readDetail(body: Blob | undefined): Promise<string | undefined> {
  if (!body) return undefined
  try {
    const { detail } = JSON.parse(await body.text()) as { detail?: unknown }
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((entry: { loc?: unknown[]; msg?: string }) =>
          [entry.loc?.at(-1), entry.msg].filter(Boolean).join(': '),
        )
        .join('; ')
    }
  } catch {
    // Not a JSON body
  }
  return undefined
}

/**
 * Returns a message for a failed tile request, or undefined when the failure needs no message.
 * Titiler answers 404 for tiles outside an item's bounds, which happens at item edges.
 */
export async function getTileErrorMessage(error: unknown): Promise<string | undefined> {
  const { status, statusText, body, message } = (error ?? {}) as TileRequestError
  if (status === undefined) return message

  const detail = await readDetail(body)
  if (status === 404 && /outside bounds/i.test(detail ?? '')) return undefined

  const text = detail ?? `${status} ${statusText ?? ''}`.trim()
  return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…` : text
}
