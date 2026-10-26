import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Collection, Item } from '@/types'
import {
  getCollectionFinderUrl,
  getCollectionRoutePath,
  getItemDownloadUrl,
  getWorkflowOutputDownloadUrl,
  getWorkflowOutputFinderUrl,
  getWorkflowOutputDownloadUrlFromItemHref,
  parseProcessingResultsHref,
  parseCollectionPath,
  parseItemDownloadSearch,
} from './catalogUtils'
import { parsePermalinkParams } from '@/utils/permalink'

// setupTests.ts stubs URL for object URLs; these helpers need the real one.
beforeAll(() => {
  vi.unstubAllGlobals()
})

const collection = (overrides: Partial<Collection> = {}): Collection =>
  ({ id: 'sentinel2_ard', links: [], ...overrides }) as unknown as Collection

const jobCollection = collection({
  id: 'qa_documentation',
  isJobCollection: true,
  links: [
    {
      rel: 'self',
      href: 'https://eodatahub.org.uk/api/catalogue/stac/catalogs/user/catalogs/npl/catalogs/processing-results/catalogs/qa-workflow/catalogs/airbus_phr_qa/collections/qa_documentation',
    },
  ],
})

// Splits a "/download/<path>?<query>" URL the way the router does.
const parseDownloadUrl = (url: string) => {
  const [path, query] = url.replace(/^\/download\//, '').split('?')
  return {
    parsedPath: parseCollectionPath(path),
    search: parseItemDownloadSearch(new URLSearchParams(query)),
  }
}

describe('getCollectionRoutePath', () => {
  it('builds public, user and job paths', () => {
    expect(getCollectionRoutePath(collection())).toBe('sentinel2_ard')
    expect(getCollectionRoutePath(collection({ isUserCollection: true }))).toBe('my-sentinel2_ard')
    expect(getCollectionRoutePath(jobCollection)).toBe(
      'npl/processing-results/catalogs/qa-workflow/catalogs/airbus_phr_qa/collections/qa_documentation',
    )
  })

  it('keeps getCollectionFinderUrl output unchanged', () => {
    expect(getCollectionFinderUrl(collection())).toBe('/finder/sentinel2_ard')
    expect(getCollectionFinderUrl(collection({ isUserCollection: true }))).toBe(
      '/finder/my-sentinel2_ard',
    )
    expect(getCollectionFinderUrl(jobCollection)).toBe(
      '/finder/npl/processing-results/catalogs/qa-workflow/catalogs/airbus_phr_qa/collections/qa_documentation',
    )
  })
})

describe('getItemDownloadUrl', () => {
  it.each(['simple', 'with/slash', 'with:colon and space'])(
    'round-trips item id %s for public, user and job collections',
    (itemId) => {
      for (const [source, type] of [
        [collection(), 'public'],
        [collection({ isUserCollection: true }), 'purchased'],
        [jobCollection, 'job'],
      ] as const) {
        const { parsedPath, search } = parseDownloadUrl(
          getItemDownloadUrl({ collectionPath: getCollectionRoutePath(source), itemId }),
        )
        expect(parsedPath.type).toBe(type)
        expect(parsedPath.collectionId).toBe(source.id)
        expect(search.itemId).toBe(itemId)
      }
    },
  )

  it('adds the workspace only for my- paths', () => {
    expect(getItemDownloadUrl({ collectionPath: 'my-airbus', itemId: 'x', workspace: 'ws' })).toBe(
      '/download/my-airbus?item=x&workspace=ws',
    )
    expect(
      getItemDownloadUrl({ collectionPath: 'sentinel2_ard', itemId: 'x', workspace: 'ws' }),
    ).toBe('/download/sentinel2_ard?item=x')
  })

  it('adds and parses the source', () => {
    const url = getItemDownloadUrl({ collectionPath: 'my-a', itemId: 'x', from: 'purchased' })
    expect(parseDownloadUrl(url).search.from).toBe('purchased')
    expect(parseItemDownloadSearch(new URLSearchParams('item=x&from=elsewhere')).from).toBe(
      undefined,
    )
  })
})

describe('getWorkflowOutputDownloadUrl', () => {
  it('builds the download URL from the item collection link', () => {
    const item = {
      id: 'result/1',
      links: [
        {
          rel: 'collection',
          href: 'https://eodatahub.org.uk/api/catalogue/stac/catalogs/user/catalogs/npl/catalogs/processing-results/catalogs/qa-workflow/catalogs/airbus_phr_qa/collections/qa_documentation',
        },
      ],
    } as unknown as Item
    const url = getWorkflowOutputDownloadUrl(item)!
    expect(url).toBe(
      '/download/npl/processing-results/catalogs/qa-workflow/catalogs/airbus_phr_qa/collections/qa_documentation?item=result%2F1&from=workflow-output',
    )
    const { parsedPath, search } = parseDownloadUrl(url)
    expect(parsedPath).toMatchObject({
      type: 'job',
      workspace: 'npl',
      collectionId: 'qa_documentation',
    })
    expect(search).toEqual({ itemId: 'result/1', workspace: undefined, from: 'workflow-output' })
  })

  it('returns undefined for items outside processing results', () => {
    const item = {
      id: 'x',
      links: [
        { rel: 'collection', href: 'https://eodatahub.org.uk/api/catalogue/stac/collections/c' },
      ],
    } as unknown as Item
    expect(getWorkflowOutputDownloadUrl(item)).toBeUndefined()
  })
})

describe('getWorkflowOutputFinderUrl', () => {
  const collectionHref =
    'https://eodatahub.org.uk/api/catalogue/stac/catalogs/user/catalogs/npl/catalogs/processing-results/catalogs/qa-workflow/catalogs/airbus_phr_qa/collections/qa_documentation'

  it('builds the finder URL from the item collection link', () => {
    const item = {
      id: 'i',
      links: [{ rel: 'collection', href: collectionHref }],
    } as unknown as Item
    const url = getWorkflowOutputFinderUrl(item)!
    expect(url).toBe(
      '/finder/npl/processing-results/catalogs/qa-workflow/catalogs/airbus_phr_qa/collections/qa_documentation',
    )
    expect(parseCollectionPath(url.replace(/^\/finder\//, ''))).toMatchObject({
      type: 'job',
      workspace: 'npl',
      collectionId: 'qa_documentation',
    })
  })

  it('uses the results collection href when the item has no collection link', () => {
    const item = { id: 'i', links: [] } as unknown as Item
    expect(getWorkflowOutputFinderUrl(item, collectionHref)).toBe(
      '/finder/npl/processing-results/catalogs/qa-workflow/catalogs/airbus_phr_qa/collections/qa_documentation',
    )
  })

  it('returns undefined for items outside processing results', () => {
    const item = {
      id: 'x',
      links: [
        { rel: 'collection', href: 'https://eodatahub.org.uk/api/catalogue/stac/collections/c' },
      ],
    } as unknown as Item
    expect(getWorkflowOutputFinderUrl(item)).toBeUndefined()
  })

  it('sets the map view to the given bounds', () => {
    const item = { id: 'i', links: [] } as unknown as Item
    const url = getWorkflowOutputFinderUrl(item, collectionHref, [-1.5, 50.5, 0.5, 51.5])!
    const [, query] = url.split('?')
    expect(parsePermalinkParams(new URLSearchParams(query)).bounds).toEqual([-1.5, 50.5, 0.5, 51.5])
  })

  it('ignores 3D bounds', () => {
    const item = { id: 'i', links: [] } as unknown as Item
    expect(getWorkflowOutputFinderUrl(item, collectionHref, [0, 0, 0, 1, 1, 1])).not.toContain('?')
  })
})

describe('workflow outputs on the workspace host', () => {
  const filesBase =
    'https://sparkgeouser.eodatahub-workspaces.org.uk/files/workspaces-eodhp/processing-results/raster-calculate/cat_b445'

  it('maps static STAC file hrefs to the catalogue job path', () => {
    expect(parseProcessingResultsHref(`${filesBase}/col_b445.json`)).toEqual({
      workspace: 'sparkgeouser',
      jobPath: 'catalogs/raster-calculate/catalogs/cat_b445/collections/col_b445',
    })
  })

  it('ignores query strings on catalogue API hrefs', () => {
    expect(
      parseProcessingResultsHref(
        'https://eodatahub.org.uk/api/catalogue/stac/catalogs/user/catalogs/npl/catalogs/processing-results/catalogs/wf/collections/c?f=json',
      ),
    ).toEqual({ workspace: 'npl', jobPath: 'catalogs/wf/collections/c' })
  })

  it('uses the results collection href when the item has no collection link', () => {
    const item = {
      id: '69450251',
      links: [{ rel: 'parent', href: `${filesBase}.json` }],
    } as unknown as Item
    expect(getWorkflowOutputDownloadUrl(item, `${filesBase}/col_b445.json`)).toBe(
      '/download/sparkgeouser/processing-results/catalogs/raster-calculate/catalogs/cat_b445/collections/col_b445?item=69450251&from=workflow-output',
    )
  })

  it('ignores the parent link, which is the job catalog for static outputs', () => {
    const item = {
      id: 'x',
      links: [{ rel: 'parent', href: `${filesBase}.json` }],
    } as unknown as Item
    expect(getWorkflowOutputDownloadUrl(item)).toBeUndefined()
  })

  it('builds the URL from a saved item href, catalogue or static', () => {
    const expected =
      '/download/sparkgeouser/processing-results/catalogs/raster-calculate/catalogs/cat_b445/collections/col_b445?item=i1&from=saved-set'
    expect(
      getWorkflowOutputDownloadUrlFromItemHref(
        'https://eodatahub.org.uk/api/catalogue/stac/catalogs/user/catalogs/sparkgeouser/catalogs/processing-results/catalogs/raster-calculate/catalogs/cat_b445/collections/col_b445/items/i1',
        'i1',
        'saved-set',
      ),
    ).toBe(expected)
    expect(
      getWorkflowOutputDownloadUrlFromItemHref(`${filesBase}/col_b445/i1.json`, 'i1', 'saved-set'),
    ).toBe(expected)
  })

  it('prefers the collection link over a parent catalog link', () => {
    const item = {
      id: 'x',
      links: [
        { rel: 'parent', href: `${filesBase}.json` },
        { rel: 'collection', href: `${filesBase}/col_b445.json` },
      ],
    } as unknown as Item
    expect(getWorkflowOutputDownloadUrl(item)).toContain('/collections/col_b445?')
  })
})
