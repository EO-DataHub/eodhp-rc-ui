import type { Collection, Item, ProcessRecord } from '@/types'
import type { RunSource } from '@/hooks/useWorkflowRun'
import { plural } from '@/library/workflowRunInputs'

/** Whether a tool runs on a dataset. A tool that names no datasets runs on any. */
export const toolAppliesTo = (tool: ProcessRecord, collection: Collection | undefined) => {
  const applicableCollections = tool.properties.applicableCollections ?? []
  if (!collection || applicableCollections.length === 0) return true
  return applicableCollections.includes(collection.id)
}

export const toolTypeLabel = (tool: ProcessRecord) =>
  tool.properties.type === 'workflow' ? 'Workflow' : 'Notebook'

interface BadgeState {
  tool: ProcessRecord
  source?: RunSource
  item?: Item
  pinnedCount: number
}

const sourceText = (source: RunSource, pinnedCount: number) => {
  switch (source) {
    case 'item':
      return '1 item'
    case 'pinned':
      return plural(pinnedCount, 'pinned item')
    case 'set':
      return 'saved set'
    case 'results':
      return 'all results'
  }
}

/** The text of the badge that stands for the hidden run panel, for example "NDVI · 3 pinned items". */
export const runPanelBadgeText = ({ tool, source, item, pinnedCount }: BadgeState) => {
  const title = tool.properties.title
  if (tool.properties.type === 'notebook') {
    return item ? `${title} · ${item.id}` : title
  }
  // The same default as the run form: the item when there is one, otherwise the pinned items
  const runSource = source ?? (item ? 'item' : 'pinned')
  return `${title} · ${sourceText(runSource, pinnedCount)}`
}
