import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Collection, StacRender } from '@/types'
import {
  aoi,
  item,
  itemNotebook,
  listRecord,
  ndviWorkflow,
  stubBrowserGlobals,
} from '@/test-data/runWorkflow'
import dataFinderStore from './useFinderStore'

const chosenTool = () => dataFinderStore.getSnapshot().context.chosenTool

const collection = { id: 'landsat_c2l2', links: [] } as unknown as Collection
const render: StacRender = { id: 'rgb', title: 'RGB', assets: [] }

beforeEach(() => {
  stubBrowserGlobals()
  dataFinderStore.send({ type: 'clearTool' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dataFinderStore chosen tool', () => {
  it('has no chosen tool to start with', () => {
    expect(chosenTool()).toBeUndefined()
  })

  it('sets the chosen tool', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    expect(chosenTool()?.id).toBe('ndvi')
  })

  it('replaces the chosen tool with a new one', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(itemNotebook) })
    expect(chosenTool()?.id).toBe('ndvi_notebook')
  })

  it('clears the chosen tool', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    dataFinderStore.send({ type: 'clearTool' })
    expect(chosenTool()).toBeUndefined()
  })

  it('keeps the chosen tool when the dataset changes', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    dataFinderStore.send({ type: 'setCollection', collection })
    expect(chosenTool()?.id).toBe('ndvi')
  })

  it('keeps the chosen tool when the filters change', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    dataFinderStore.send({ type: 'queryFilterChange', queryFilter: { op: '=' } })
    dataFinderStore.send({ type: 'queryFilterChange', queryFilter: undefined })
    expect(chosenTool()?.id).toBe('ndvi')
  })

  it('keeps the chosen tool when an area is drawn or removed', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    dataFinderStore.send({ type: 'drawCreateOrUpdate', mapEvent: { features: [aoi] } })
    dataFinderStore.send({ type: 'storeAoi', aoi: undefined })
    expect(chosenTool()?.id).toBe('ndvi')
  })

  it('keeps the chosen tool when items are pinned', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    dataFinderStore.send({
      type: 'addPinnedItem',
      item,
      collectionRender: render,
      isLicenseProprietary: false,
      isUserCollection: false,
      collectionName: 'Sentinel-2 ARD',
    })
    dataFinderStore.send({ type: 'clearAllPinnedItems' })
    expect(chosenTool()?.id).toBe('ndvi')
  })

  it('keeps the chosen tool when a side panel opens and closes', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    // Toggling the panel is not an Open in request
    const openCountBefore = dataFinderStore.getSnapshot().context.integrationToolsOpenCount
    dataFinderStore.send({ type: 'toggleIntegrationToolsPanel', item })
    expect(dataFinderStore.getSnapshot().context.integrationToolsOpenCount).toBe(openCountBefore)
    dataFinderStore.send({ type: 'closeSecondaryPanel' })
    expect(chosenTool()?.id).toBe('ndvi')
  })
})

describe('dataFinderStore run panel', () => {
  const panel = () => {
    const { isRunPanelOpen, runSource } = dataFinderStore.getSnapshot().context
    return { isRunPanelOpen, runSource }
  }

  beforeEach(() => {
    dataFinderStore.send({ type: 'hideRunPanel' })
  })

  it('opens, hides and opens again, keeping the source to use', () => {
    dataFinderStore.send({ type: 'openRunPanel', source: 'pinned' })
    expect(panel()).toEqual({ isRunPanelOpen: true, runSource: 'pinned' })

    dataFinderStore.send({ type: 'hideRunPanel' })
    expect(panel().isRunPanelOpen).toBe(false)

    dataFinderStore.send({ type: 'openRunPanel' })
    expect(panel()).toEqual({ isRunPanelOpen: true, runSource: 'pinned' })
  })

  it('keeps the chosen tool when the panel is hidden', () => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(ndviWorkflow) })
    dataFinderStore.send({ type: 'openRunPanel' })
    dataFinderStore.send({ type: 'hideRunPanel' })
    expect(chosenTool()?.id).toBe('ndvi')
  })
})
