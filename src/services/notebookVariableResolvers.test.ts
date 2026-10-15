import { describe, expect, it } from 'vitest'
import type { Item, ProcessRecord } from '@/types'
import {
  buildNotebookVariables,
  getMissingVariables,
  isPinSetNotebook,
} from './notebookVariableResolvers'

const item = {
  id: 'S2A_20250601',
  collection: 'sentinel2_ard',
  links: [{ rel: 'self', type: 'application/json', href: 'https://hub.example/items/S2A' }],
} as Item

const aoi: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Point', coordinates: [0, 51] },
}

const pinSet = {
  id: 'set-1',
  name: 'Floods 2025',
  workspace: 'my-ws',
  apiBaseUrl: 'https://hub.example',
}

const notebook = (inputParameters?: Record<string, object>): ProcessRecord => ({
  id: 'nb',
  type: 'Feature',
  properties: { type: 'notebook', title: 'NB', description: null, inputParameters },
})

describe('buildNotebookVariables', () => {
  it('fills item variables from an item context', () => {
    const vars = buildNotebookVariables(['STAC_ITEM_LINK', 'STAC_COLLECTION_NAME', 'AOI'], {
      item,
      aoi,
      includeAoi: true,
    })
    expect(vars).toEqual({
      STAC_ITEM_LINK: 'https://hub.example/items/S2A',
      STAC_COLLECTION_NAME: 'sentinel2_ard',
      AOI: JSON.stringify(aoi),
    })
  })

  it('leaves out the AOI unless it is included', () => {
    const vars = buildNotebookVariables(['AOI'], { item, aoi, includeAoi: false })
    expect(vars).toEqual({})
  })

  it('fills set variables from a set context', () => {
    const vars = buildNotebookVariables(
      ['PIN_SET_ID', 'PIN_SET_NAME', 'WORKSPACE_NAME', 'EODH_BASE_URL'],
      {
        pinSet,
      },
    )
    expect(vars).toEqual({
      PIN_SET_ID: 'set-1',
      PIN_SET_NAME: 'Floods 2025',
      WORKSPACE_NAME: 'my-ws',
      EODH_BASE_URL: 'https://hub.example',
    })
  })

  it('leaves out variables the context cannot fill', () => {
    expect(buildNotebookVariables(['STAC_ITEM_LINK', 'PIN_SET_ID'], { pinSet })).toEqual({
      PIN_SET_ID: 'set-1',
    })
    expect(buildNotebookVariables(['PIN_SET_ID'], { item })).toEqual({})
  })

  it('ignores keys without a resolver', () => {
    expect(buildNotebookVariables(['THRESHOLD'], { item })).toEqual({})
  })
})

describe('getMissingVariables', () => {
  it('reports required keys the context could not fill', () => {
    const keys = ['PIN_SET_ID', 'WORKSPACE_NAME']
    expect(getMissingVariables(keys, buildNotebookVariables(keys, { item }))).toEqual(keys)
  })

  it('does not report the optional AOI or keys without a resolver', () => {
    const keys = ['STAC_ITEM_LINK', 'AOI', 'THRESHOLD']
    expect(getMissingVariables(keys, buildNotebookVariables(keys, { item }))).toEqual([])
  })
})

describe('isPinSetNotebook', () => {
  it('is true when the notebook declares PIN_SET_ID', () => {
    expect(isPinSetNotebook(notebook({ PIN_SET_ID: {}, WORKSPACE_NAME: {} }))).toBe(true)
  })

  it('is false for item notebooks and records without parameters', () => {
    expect(isPinSetNotebook(notebook({ STAC_ITEM_LINK: {} }))).toBe(false)
    expect(isPinSetNotebook(notebook())).toBe(false)
  })
})
