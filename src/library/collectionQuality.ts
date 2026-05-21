import {
  collectionCategorization,
  isValidCollectionId,
} from '@/constants/collectionCategorizations'
import type { Collection } from '@/types'

/** True when the collection exposes QA in the UI or gallery filter (asset hrefs or catalogue flag). */
export function collectionHasQAIndicators(collection: Collection): boolean {
  if (
    collection.assets?.qa_documentation?.href != null ||
    collection.assets?.qa_radiometric?.href != null
  ) {
    return true
  }
  if (!isValidCollectionId(collection.id)) {
    return false
  }
  return Boolean(collectionCategorization[collection.id].qa)
}
