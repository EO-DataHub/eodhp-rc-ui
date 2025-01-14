import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { expect, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import 'vitest-canvas-mock'

expect.extend(matchers)

vi.stubGlobal('URL', {
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn(),
  toString: () => 'URL',
  valueOf: () => 'URL',
})

// runs a clean after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})
