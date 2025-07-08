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

/**
 * Dynamically builds a notebook URL based on the inputSpec of the notebook config.
 * Supports 'singleUrl', 'urlList', 'bbox', and 'custom' types.
 */
function buildNotebookUrl(nb: NotebookConfig, items: Item[]): string {
  const params: Record<string, string> = {}
  if (nb.inputSpec) {
    for (const [param, type] of Object.entries(nb.inputSpec)) {
      if (type === 'singleUrl') {
        const cog = getCogAssetHref(items[0])
        if (cog) params[param] = encodeURIComponent(cog)
      } else if (type === 'urlList') {
        const cogs = items.map(getCogAssetHref).filter(Boolean)
        if (cogs.length) params[param] = encodeURIComponent(cogs.join(','))
      } else if (type === 'bbox') {
        const [minLon, minLat] = items[0].bbox
        const small_bbox = [minLon, minLat, minLon + 0.008, minLat + 0.008]
        params[param] = small_bbox.join(',')
      }
      // 'custom' type can be handled here if needed
    }
  }
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `${NOTEBOOK_BASE_URL}/${nb.id}${query ? `?${query}` : ''}`
}

/**
 * Returns notebook links for the given items and notebook configs, using inputSpec for parameterization.
 */
export function getNotebookLinksForItems(
  items: Item[],
  notebooks: NotebookConfig[],
): NotebookLink[] {
  return notebooks.map((nb) => ({
    id: nb.id,
    label: nb.label,
    description: nb.description,
    url: buildNotebookUrl(nb, items),
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
