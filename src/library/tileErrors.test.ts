// @vitest-environment node
// jsdom Blob has no text(); browsers and Node do.
import { describe, expect, it } from 'vitest'
import { getTileErrorMessage } from './tileErrors'

const ajaxError = (status: number, body: unknown, statusText = '') => ({
  status,
  statusText,
  body: new Blob([typeof body === 'string' ? body : JSON.stringify(body)]),
  message: 'AJAXError',
})

describe('getTileErrorMessage', () => {
  it('ignores tiles outside the item bounds', async () => {
    const error = ajaxError(404, { detail: 'Tile(x=0, y=0, z=10) is outside bounds' })
    expect(await getTileErrorMessage(error)).toBeUndefined()
  })

  it('reports other 404s, such as a missing asset', async () => {
    const error = ajaxError(404, { detail: "'nope' is not valid, should be one of ['cog']" })
    expect(await getTileErrorMessage(error)).toBe("'nope' is not valid, should be one of ['cog']")
  })

  it('joins validation errors', async () => {
    const error = ajaxError(422, {
      detail: [{ loc: ['query', 'colormap_name'], msg: 'Input should be one of a, b' }],
    })
    expect(await getTileErrorMessage(error)).toBe('colormap_name: Input should be one of a, b')
  })

  it('falls back to the status when the body is not JSON', async () => {
    expect(await getTileErrorMessage(ajaxError(502, '<html>', 'Bad Gateway'))).toBe(
      '502 Bad Gateway',
    )
  })

  it('shortens long messages', async () => {
    const message = await getTileErrorMessage(ajaxError(500, { detail: 'x'.repeat(500) }))
    expect(message).toHaveLength(201)
  })

  it('uses the message of errors without a status', async () => {
    expect(await getTileErrorMessage(new Error('Failed to fetch'))).toBe('Failed to fetch')
  })
})
