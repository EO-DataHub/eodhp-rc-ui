/**
 * Permalink restore helpers: default render for collections and restore logic for
 * multi- and single-collection permalink URLs.
 */

import { fetchItem } from '@/services/itemService'
import dataFinderStore from './useFinderStore'
import {
  collectionRenderingConfig,
  getCollectionConfigKey,
} from '@/library/collectionRenderingConfig'
import { isCollectionPurchasable } from '@/library/purchasabilityConfig'
import type { Collection, Item, StacRender } from '@/types'
import type { ItemByCollection } from '@/utils/permalink'

const PLACEHOLDER_RENDER: StacRender = {
  id: 'default',
  title: 'Default visualization',
  assets: [],
}

export function getDefaultCollectionRender(
  collection: Collection,
  isUserCollection: boolean,
): StacRender {
  const configKey = getCollectionConfigKey(collection.id, isUserCollection)
  const collectionConfig = collectionRenderingConfig[configKey]
  const baseRenders = collectionConfig?.renders ?? {}
  const renders = { ...baseRenders, ...collection.renders }
  const options = Object.entries(renders).map(([id, render]) => ({ ...render, id }))
  return options.length > 0 ? options[0] : PLACEHOLDER_RENDER
}

export type ResolveCollection = (
  cid: string,
) => { collection: Collection; isUserCollection: boolean } | null

export function restoreFromPermalinkMultiCollection(params: {
  itemsByCollection: ItemByCollection[]
  resolveCollection: ResolveCollection
  workspaceTokenForUser: string | undefined
}): Promise<void> {
  const { itemsByCollection, resolveCollection, workspaceTokenForUser } = params

  const byCollection = new Map<string, string[]>()
  for (const { collectionId: cid, itemId } of itemsByCollection) {
    const list = byCollection.get(cid) ?? []
    list.push(itemId)
    byCollection.set(cid, list)
  }

  const promises: Promise<void>[] = []
  byCollection.forEach((ids: string[], cid: string) => {
    const resolved = resolveCollection(cid)
    if (!resolved) return
    const { collection: col, isUserCollection: isUser } = resolved
    const collectionUrl = col.links.find((l) => l.rel === 'self')?.href
    if (!collectionUrl) return
    const workspaceToken = isUser ? workspaceTokenForUser : undefined
    const render = getDefaultCollectionRender(col, isUser)
    const collectionName = col.title ?? col.id

    promises.push(
      Promise.allSettled(
        ids.map((itemId: string) => fetchItem({ collectionUrl, itemId, workspaceToken })),
      ).then((results) => {
        const items = results
          .filter((r): r is PromiseFulfilledResult<Item> => r.status === 'fulfilled')
          .map((r) => r.value)
        if (items.length > 0) {
          dataFinderStore.send({
            type: 'addPinnedItems',
            items,
            collectionRender: render,
            isLicenseProprietary: isCollectionPurchasable(col),
            isUserCollection: isUser,
            collectionName,
            collection: col,
          })
        }
      }),
    )
  })

  return Promise.all(promises).then(() => undefined)
}

export function restoreFromPermalinkSingleCollection(params: {
  itemIds: string[]
  collection: Collection
  collectionRender: StacRender
  isUserCollection: boolean
  workspaceTokenForUser: string | undefined
}): Promise<void> {
  const { itemIds, collection, collectionRender, isUserCollection, workspaceTokenForUser } = params

  const collectionUrl = collection.links.find((l) => l.rel === 'self')?.href
  if (!collectionUrl) return Promise.resolve()

  const workspaceToken = isUserCollection ? workspaceTokenForUser : undefined
  const collectionName = collection.title ?? collection.id

  return Promise.allSettled(
    itemIds.map((itemId) => fetchItem({ collectionUrl, itemId, workspaceToken })),
  ).then((results) => {
    const items = results
      .filter((r): r is PromiseFulfilledResult<Item> => r.status === 'fulfilled')
      .map((r) => r.value)
    if (items.length > 0) {
      dataFinderStore.send({
        type: 'addPinnedItems',
        items,
        collectionRender,
        isLicenseProprietary: isCollectionPurchasable(collection),
        isUserCollection,
        collectionName,
        collection,
      })
    }
  })
}
