import { describe, expect, test } from 'vitest'
import {
  collectionHasQAIndicators,
  findQALinkByRel,
  getDefaultQATab,
  groupRadiometricWindowsByYear,
  parseFrameworkReference,
  parseRadiometricWindows,
} from './collectionQuality'
import type { Collection } from '@/types'

const collectionWithAssets = (assets: Record<string, { href: string }>) =>
  ({ id: 'test', assets }) as unknown as Collection

describe('collectionHasQAIndicators', () => {
  test('is true when either QA asset exists', () => {
    expect(
      collectionHasQAIndicators(collectionWithAssets({ qa_documentation: { href: 'a' } })),
    ).toBe(true)
    expect(collectionHasQAIndicators(collectionWithAssets({ qa_radiometric: { href: 'b' } }))).toBe(
      true,
    )
  })

  test('is false without QA assets', () => {
    expect(collectionHasQAIndicators(collectionWithAssets({ thumbnail: { href: 'c' } }))).toBe(
      false,
    )
  })
})

describe('getDefaultQATab', () => {
  test('prefers documentation, falls back to validation', () => {
    expect(
      getDefaultQATab(
        collectionWithAssets({ qa_documentation: { href: 'a' }, qa_radiometric: { href: 'b' } }),
      ),
    ).toBe('qa_documentation')
    expect(getDefaultQATab(collectionWithAssets({ qa_radiometric: { href: 'b' } }))).toBe(
      'qa_validation',
    )
  })
})

describe('findQALinkByRel', () => {
  const links = [
    { rel: 'https://eodatahub.org.uk/api/ontologies/qa/data-visualisation', href: 'dash' },
    { rel: 'https://eodatahub.org.uk/api/ontologies/qa/detailed-result-report', href: 'vwd' },
    { rel: 'https://eodatahub.org.uk/api/ontologies/qa/data_product_report', href: 'dqr' },
  ]

  test('matches on the last rel segment, ignoring hyphen/underscore differences', () => {
    expect(findQALinkByRel(links, 'data_product_report')?.href).toBe('dqr')
    expect(findQALinkByRel(links, 'detailed_result_report')?.href).toBe('vwd')
  })

  test('does not match partial segments', () => {
    expect(findQALinkByRel(links, 'report')).toBeUndefined()
    expect(findQALinkByRel(undefined, 'report')).toBeUndefined()
  })
})

describe('parseFrameworkReference', () => {
  test('splits label and URL', () => {
    expect(
      parseFrameworkReference(
        'Result criteria follows EDAP EO Mission Quality Assessment Framework - Optical Guidelines, found at: https://earth.esa.int/doc.pdf/1c26',
      ),
    ).toEqual({
      label:
        'Result criteria follows EDAP EO Mission Quality Assessment Framework - Optical Guidelines',
      href: 'https://earth.esa.int/doc.pdf/1c26',
    })
  })

  test('does not cut words that end in "at" or "see"', () => {
    expect(
      parseFrameworkReference('Assessment is available in PDF format: https://example.com/a.pdf'),
    ).toEqual({
      label: 'Assessment is available in PDF format',
      href: 'https://example.com/a.pdf',
    })
    expect(parseFrameworkReference('Oversee https://example.com')?.label).toBe('Oversee')
    expect(parseFrameworkReference('Details, see https://example.com')?.label).toBe('Details')
  })

  test('returns null without a URL', () => {
    expect(parseFrameworkReference('No link here')).toBeNull()
    expect(parseFrameworkReference(undefined)).toBeNull()
  })
})

describe('radiometric windows', () => {
  test('parses keys and groups them by year and month', () => {
    const windows = parseRadiometricWindows([
      '2024-11-01,2024-11-30',
      '2022-03-01,2022-03-31',
      '2024-05-01,2024-05-31',
      'not-a-date',
    ])
    expect(windows).toHaveLength(3)

    const { years, byYear } = groupRadiometricWindowsByYear(windows)
    expect(years).toEqual([2022, 2024])
    expect(byYear.get(2024)?.get(11)).toBe('2024-11-01,2024-11-30')
    expect(byYear.get(2024)?.has(6)).toBe(false)
  })
})
