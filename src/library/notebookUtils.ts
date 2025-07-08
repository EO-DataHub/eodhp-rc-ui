import type { Item } from '@/types'
import type { NotebookConfig } from '@/hooks/useNotebookConfigs'
import { getCogAssetHref } from './assetUtils'

const NOTEBOOK_BASE_URL = import.meta.env.VITE_NOTEBOOK_BASE_URL

export interface NotebookLink {
  id: string
  label: string
  description?: string
  url: string
}

export function getNotebookLinks(item: Item, notebooks: NotebookConfig[]): NotebookLink[] {
  const cogAssetHref = getCogAssetHref(item)
  if (!cogAssetHref) return []
  const [minLon, minLat] = item.bbox
  const small_bbox = [minLon, minLat, minLon + 0.008, minLat + 0.008]
  const cogUrl = encodeURIComponent(cogAssetHref)
  const bboxStr = small_bbox.join(',')
  return notebooks.map((nb) => ({
    id: nb.id,
    label: nb.label,
    description: nb.description,
    url: `${NOTEBOOK_BASE_URL}/${nb.id}?cog_url=${cogUrl}&bbox=${bboxStr}`,
  }))
}

export function getBatchNotebookLinks(items: Item[], notebooks: NotebookConfig[]): NotebookLink[] {
  const cogAssetHrefs = items.map(getCogAssetHref).filter((href): href is string => !!href)
  if (cogAssetHrefs.length === 0) return []
  const cogUrlList = encodeURIComponent(cogAssetHrefs.join(','))
  return notebooks.map((nb) => ({
    id: nb.id,
    label: nb.label,
    description: nb.description,
    url: `${NOTEBOOK_BASE_URL}/${nb.id}?cog_url=${cogUrlList}`,
  }))
}

/**
 * Filters notebooks based on the number of items and collection(s).
 * - If one item: minItems/maxItems must be 1 (or undefined) and collection must match.
 * - If multiple items: minItems > 1 (or undefined) and collection must match all items.
 */
export function filterNotebooksForItems(
  items: Item[],
  notebooks: NotebookConfig[],
): NotebookConfig[] {
  if (items.length === 0) return []
  if (items.length === 1) {
    const item = items[0]
    return notebooks.filter(
      (nb) =>
        (!nb.collections || nb.collections.includes(item.collection)) &&
        (nb.minItems === undefined || nb.minItems === 1) &&
        (nb.maxItems === undefined || nb.maxItems === 1),
    )
  } else {
    // For batch: maxItems must be greater than 1
    return notebooks.filter((nb) => {
      const allCollectionsMatch =
        !nb.collections || items.every((item) => nb.collections!.includes(item.collection))
      return (
        allCollectionsMatch &&
        (nb.minItems === undefined || nb.minItems <= items.length) &&
        (nb.maxItems === undefined || nb.maxItems >= items.length) &&
        (nb.maxItems === undefined || nb.maxItems > 1)
      )
    })
  }
}
