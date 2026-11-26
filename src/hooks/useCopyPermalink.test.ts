import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { MapInstance } from 'react-map-gl/maplibre'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { item, listRecord, ndviWorkflow, stubBrowserGlobals } from '@/test-data/runWorkflow'
import { usePermalink } from './useCopyPermalink'

const mapInstance = {
  getBounds: () => ({
    getWest: () => -1,
    getSouth: () => 51,
    getEast: () => 0,
    getNorth: () => 52,
  }),
} as unknown as MapInstance

const permalinkParams = () => {
  const { result } = renderHook(() => usePermalink('sentinel2_ard', [item]))
  const url = result.current.url!
  return new URLSearchParams(url.slice(url.indexOf('?') + 1))
}

beforeEach(() => {
  stubBrowserGlobals()
  dataFinderStore.send({ type: 'mapLoad', mapInstance })
  dataFinderStore.send({ type: 'clearTool' })
})

afterEach(() => {
  dataFinderStore.send({ type: 'clearTool' })
  dataFinderStore.send({ type: 'mapLoad', mapInstance: undefined })
  vi.unstubAllGlobals()
})

describe('usePermalink with a chosen tool', () => {
  it('adds the chosen tool to the link', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    const params = permalinkParams()
    expect(params.get('tool')).toBe('ndvi')
    expect(params.get('items')).toContain(item.id)
  })

  it('leaves the tool out when none is chosen', () => {
    expect(permalinkParams().has('tool')).toBe(false)
  })
})
