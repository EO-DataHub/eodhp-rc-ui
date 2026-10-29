import { describe, expect, it } from 'vitest'
import type { InputParameterEntry } from '@/types'
import { aoi, item, ITEM_SELF_HREF } from '@/test-data/runWorkflow'
import {
  buildWorkflowVariables,
  hasResolver,
  type WorkflowLaunchContext,
} from './workflowVariableResolvers'

const context: WorkflowLaunchContext = { item, aoi, includeAoi: true }

const build = (inputParameters: Record<string, InputParameterEntry>, ctx = context) =>
  buildWorkflowVariables(inputParameters, ctx)

describe('buildWorkflowVariables', () => {
  describe('by Hub type', () => {
    it('fills a stac-item input with the item link', () => {
      expect(build({ stac_item: { hubType: 'stac-item', cwlType: 'Directory' } })).toEqual({
        stac_item: ITEM_SELF_HREF,
      })
    })

    it('fills an aoi input with the drawn area', () => {
      expect(build({ area: { hubType: 'aoi', cwlType: 'string' } })).toEqual({
        area: JSON.stringify(aoi),
      })
    })

    it('leaves out an aoi input when the area is not included or not drawn', () => {
      const inputs: Record<string, InputParameterEntry> = {
        area: { hubType: 'aoi', cwlType: 'string' },
      }
      expect(build(inputs, { ...context, includeAoi: false })).toEqual({})
      expect(build(inputs, { ...context, aoi: null })).toEqual({})
    })

    it('uses the Hub type before the variableRef', () => {
      expect(build({ input: { hubType: 'stac-item', variableRef: 'AOI' } })).toEqual({
        input: ITEM_SELF_HREF,
      })
    })

    it('uses the Hub type before the key name', () => {
      expect(build({ AOI: { hubType: 'stac-item' } })).toEqual({ AOI: ITEM_SELF_HREF })
    })

    it('falls back to the variableRef when the Hub type has no resolver', () => {
      expect(build({ bbox: { hubType: 'bbox', cwlType: 'string', variableRef: 'AOI' } })).toEqual({
        bbox: JSON.stringify(aoi),
      })
    })
  })

  describe('by variableRef', () => {
    it('resolves an input with no Hub type by its variableRef', () => {
      expect(
        build({
          stac_item: { variableRef: 'STAC_ITEM_LINK' },
          bbox: { variableRef: 'AOI' },
        }),
      ).toEqual({ stac_item: ITEM_SELF_HREF, bbox: JSON.stringify(aoi) })
    })

    it('uses the variableRef before the key name', () => {
      expect(build({ AOI: { variableRef: 'STAC_ITEM_LINK' } })).toEqual({ AOI: ITEM_SELF_HREF })
    })
  })

  describe('by key name', () => {
    it('resolves context variables with no Hub type by their key', () => {
      expect(
        build(
          {
            STAC_COLLECTION_NAME: {},
            WORKSPACE_NAME: {},
            EODH_BASE_URL: {},
          },
          { ...context, workspace: 'my-ws', apiBaseUrl: 'https://hub.example' },
        ),
      ).toEqual({
        STAC_COLLECTION_NAME: 'sentinel2_ard',
        WORKSPACE_NAME: 'my-ws',
        EODH_BASE_URL: 'https://hub.example',
      })
    })

    it('still resolves the item link and area by key', () => {
      expect(build({ STAC_ITEM_LINK: {}, AOI: {} })).toEqual({
        STAC_ITEM_LINK: ITEM_SELF_HREF,
        AOI: JSON.stringify(aoi),
      })
    })
  })

  it('leaves out inputs the user fills in', () => {
    expect(build({ threshold: { type: 'number', cwlType: 'string', default: 0.3 } })).toEqual({})
  })
})

describe('hasResolver', () => {
  it('is true for inputs with a supported Hub type', () => {
    expect(hasResolver('stac_item', { hubType: 'stac-item' })).toBe(true)
    expect(hasResolver('area', { hubType: 'aoi' })).toBe(true)
  })

  it('is true for inputs with a known variableRef or key', () => {
    expect(hasResolver('bbox', { variableRef: 'AOI' })).toBe(true)
    expect(hasResolver('STAC_COLLECTION_NAME', {})).toBe(true)
    expect(hasResolver('WORKSPACE_NAME', {})).toBe(true)
  })

  it('is false for inputs the user fills in', () => {
    expect(hasResolver('threshold', { cwlType: 'string', default: 0.3 })).toBe(false)
  })
})
