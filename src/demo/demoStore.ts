import { createStore } from '@xstate/store'
import type { DemoWorkflow, RunBatch, SavedSet } from './demoTypes'
import { SEED_SETS, SEED_WORKFLOWS, seedRuns } from './mockData'

const STORAGE_KEY = 'eodh-demo-workflows'

interface DemoContext {
  sets: SavedSet[]
  /** Workflows published through the Create workflow flow. */
  workspaceWorkflows: DemoWorkflow[]
  runs: RunBatch[]
  /** Ids of the current Data Finder search results (capped), written by the results tab. */
  resultIds: string[]
  resultsTotal: number
}

type PersistedContext = Pick<DemoContext, 'sets' | 'workspaceWorkflows' | 'runs'>

const loadPersisted = (): Partial<PersistedContext> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<PersistedContext>) : {}
  } catch {
    return {}
  }
}

const persisted = loadPersisted()

const demoStore = createStore({
  context: {
    sets: persisted.sets ?? SEED_SETS,
    workspaceWorkflows: persisted.workspaceWorkflows ?? [],
    runs: persisted.runs ?? seedRuns(Date.now()),
    resultIds: [],
    resultsTotal: 0,
  } as DemoContext,
  on: {
    addSet: (context, event: { set: SavedSet }) => ({
      ...context,
      sets: [event.set, ...context.sets],
    }),
    removeSet: (context, event: { setId: string }) => ({
      ...context,
      sets: context.sets.filter((s) => s.id !== event.setId),
    }),
    removeSetItems: (context, event: { setId: string; itemIds: string[] }) => ({
      ...context,
      sets: context.sets.map((s) =>
        s.id === event.setId
          ? {
              ...s,
              items: s.items.filter((i) => !event.itemIds.includes(i.id)),
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    }),
    renameSet: (context, event: { setId: string; name: string }) => ({
      ...context,
      sets: context.sets.map((s) =>
        s.id === event.setId ? { ...s, name: event.name, updatedAt: new Date().toISOString() } : s,
      ),
    }),
    publishWorkflow: (context, event: { workflow: DemoWorkflow }) => ({
      ...context,
      workspaceWorkflows: [
        event.workflow,
        ...context.workspaceWorkflows.filter((w) => w.id !== event.workflow.id),
      ],
    }),
    setWorkflowVisibility: (
      context,
      event: { workflowId: string; visibility: DemoWorkflow['visibility'] },
    ) => ({
      ...context,
      workspaceWorkflows: context.workspaceWorkflows.map((w) =>
        w.id === event.workflowId ? { ...w, visibility: event.visibility } : w,
      ),
    }),
    startRun: (context, event: { run: RunBatch }) => ({
      ...context,
      runs: [event.run, ...context.runs],
    }),
    retryFailedJobs: (context, event: { runId: string }) => ({
      ...context,
      runs: context.runs.map((run) =>
        run.id === event.runId
          ? {
              ...run,
              jobs: run.jobs.map((job) =>
                job.fails ? { ...job, fails: false, retriedAt: Date.now() } : job,
              ),
            }
          : run,
      ),
    }),
    setResults: (context, event: { ids: string[]; total: number }) => ({
      ...context,
      resultIds: event.ids,
      resultsTotal: event.total,
    }),
    resetDemo: (context) => ({
      ...context,
      sets: SEED_SETS,
      workspaceWorkflows: [],
      runs: seedRuns(Date.now()),
    }),
  },
})

let lastPersisted: PersistedContext | undefined

demoStore.subscribe((snapshot) => {
  const { sets, workspaceWorkflows, runs } = snapshot.context
  if (
    lastPersisted?.sets === sets &&
    lastPersisted.workspaceWorkflows === workspaceWorkflows &&
    lastPersisted.runs === runs
  ) {
    return
  }
  lastPersisted = { sets, workspaceWorkflows, runs }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sets, workspaceWorkflows, runs }))
  } catch {
    // Storage can be full or blocked; the demo still works for this session.
  }
})

export const allWorkflows = (context: DemoContext) => [
  ...context.workspaceWorkflows,
  ...SEED_WORKFLOWS,
]

export default demoStore
