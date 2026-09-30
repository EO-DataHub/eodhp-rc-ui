import type { SavedSet } from './demoTypes'

export const collectionsOf = (set: SavedSet) => [...new Set(set.items.map((i) => i.collection))]
