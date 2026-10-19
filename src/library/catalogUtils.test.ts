import { describe, expect, it } from 'vitest'
import type { Collection } from '@/types'
import {
  getCollectionFinderUrl,
  getCollectionRoutePath,
  getItemDownloadUrl,
  parseCollectionPath,
  parseItemDownloadSearch,
} from './catalogUtils'

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
