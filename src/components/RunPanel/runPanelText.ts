import type { Item, ProcessRecord, WorkflowJob } from '@/types'
import type { RunSource } from '@/hooks/useWorkflowRun'
import { plural } from '@/library/workflowRunInputs'
import { countStartedJobs, startedJobCountsText, type VisitJob } from '@/library/runPanelJobs'
import { toolAppliesTo } from '@/library/integrationTools'

interface BadgeState {
  tool?: ProcessRecord
  source?: RunSource
  item?: Item
  pinnedCount: number
  /** The jobs started in this visit, with the jobs list to read their status from. */
  visitJobs?: readonly VisitJob[]
  jobs?: WorkflowJob[]
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

/**
 * The text of the badge that stands for the hidden run panel, for example "NDVI · 3 pinned items"
 * before a run or "NDVI · 1 running, 1 finished" after one. Undefined with no tool chosen and no
 * job from this visit running, when the panel's plain Tools button shows instead.
 */
export const runPanelBadgeText = ({
  tool,
  source,
  item,
  pinnedCount,
  visitJobs = [],
  jobs = [],
}: BadgeState) => {
  const lastRun = visitJobs.at(-1)
  // After a run of the chosen workflow, or with jobs still running once the tool is cleared
  if (lastRun && (!tool || tool.id === lastRun.workflowId)) {
    const counts = countStartedJobs(
      jobs,
      visitJobs.map((job) => job.jobId),
    )
    if (tool !== undefined || counts.running > 0) {
      return `${tool?.properties.title ?? lastRun.workflowTitle} · ${startedJobCountsText(counts)}`
    }
  }
  if (!tool) return undefined
  const title = tool.properties.title
  if (tool.properties.type === 'notebook') {
    // An item from another dataset is not one the notebook opens
    return item && toolAppliesTo(tool, item.collection) ? `${title} · ${item.id}` : title
  }
  // The same default as the run form: the item when there is one, otherwise the pinned items
  const runSource = source ?? (item ? 'item' : 'pinned')
  return `${title} · ${sourceText(runSource, pinnedCount)}`
}
