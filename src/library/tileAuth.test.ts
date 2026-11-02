import { describe, expect, it } from 'vitest'
import type { Collection, Item, StacRender } from '@/types'
import { getItemTileTokenType } from './tileAuth'

const render: StacRender = { id: 'ndvi', title: 'NDVI', assets: ['data'] }

function makeItem(overrides: Partial<Item> = {}): Item {
  return { id: 'item-1', collection: 'col-1', render, ...overrides } as Item
}

describe('getItemTileTokenType', () => {
  it('uses the workspace token for workflow job outputs', () => {
    const item = makeItem({ collectionRef: { id: 'col-1', isJobCollection: true } as Collection })
    expect(getItemTileTokenType(item)).toBe('workspace')
  })

  it('uses the workspace token for job outputs even when the render says auth is off', () => {
    const item = makeItem({
      render: { ...render, auth: false },
      collectionRef: { id: 'col-1', isJobCollection: true } as Collection,
    })
    expect(getItemTileTokenType(item)).toBe('workspace')
  })

  it('uses the workspace token for purchased collections', () => {
    expect(getItemTileTokenType(makeItem({ isUserCollection: true }))).toBe('workspace')
  })

  it('needs no token for public collections', () => {
    const item = makeItem({ collectionRef: { id: 'col-1' } as Collection })
    expect(getItemTileTokenType(item)).toBeUndefined()
  })

  it('uses the keycloak token for public collections whose render needs auth', () => {
    expect(getItemTileTokenType(makeItem({ render: { ...render, auth: true } }))).toBe('keycloak')
  })

  it('needs no token without a render', () => {
    expect(getItemTileTokenType(makeItem({ render: undefined }))).toBeUndefined()
  })
})
