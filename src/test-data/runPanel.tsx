import React from 'react'
import { act, render, screen, within } from '@testing-library/react'
import type { Item, ProcessDetail, WorkflowJob } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { allTools, listRecord } from './runWorkflow'
import { fanOutWorkflows, workflowJob } from './runWorkflowFanOut'
import { withProviders, type ProviderOptions } from './runWorkflowRender'

type RunSource = 'item' | 'pinned' | 'set' | 'results'

const RUN_PANEL_MODULE = '@/components/RunPanel/RunPanel'

/**
 * Loads the run panel when a test renders it, not when the file loads, so the other tests in a
 * file that uses these helpers still run while the panel module does not exist.
 */
const loadRunPanel = async () => {
  const runPanelModule = (await import(/* @vite-ignore */ RUN_PANEL_MODULE)) as {
    RunPanel: React.ComponentType
  }
  return runPanelModule.RunPanel
}

/** Renders `ui` next to the run panel, inside the providers the app gives them. */
export const renderWithRunPanel = async (
  ui: React.ReactNode = null,
  options: ProviderOptions = {},
) => {
  const RunPanel = await loadRunPanel()
  return render(
    withProviders(
      <>
        {ui}
        <RunPanel />
      </>,
      options,
    ),
  )
}

/** The open run panel. */
export const runPanel = () => screen.findByRole('complementary', { name: 'Tools' })

export const queryRunPanel = () => screen.queryByRole('complementary', { name: 'Tools' })

/** Opens the run panel through the store, as the Data Finder's Run buttons do. */
export const openRunPanel = (options: { source?: RunSource; item?: Item } = {}) =>
  act(() => {
    dataFinderStore.send({ type: 'openRunPanel', ...options })
  })

export const hideRunPanel = () => dataFinderStore.send({ type: 'hideRunPanel' })

export const chooseTool = (tool: ProcessDetail) =>
  act(() => {
    dataFinderStore.send({ type: 'chooseTool', tool: listRecord(tool) })
  })

/** A Run on choice in the panel. */
export const sourceRadio = (panel: HTMLElement, name: RegExp) =>
  within(panel).getByRole('radio', { name })

export const runWorkflowButton = (panel: HTMLElement) =>
  within(panel).getByRole('button', { name: 'Run workflow' })

/** Answers catalogue record requests from every tool fixture. */
export const fetchAnyToolById = (id: string) => {
  const record = [...allTools, ...fanOutWorkflows].find((tool) => tool.id === id)
  return Promise.resolve(
    record
      ? { data: record, error: null, notFound: false }
      : { data: null, error: 'Not found', notFound: true },
  )
}

/** A job as the workspace jobs list returns it. */
export const listedJob = (
  id: string,
  processID: string,
  status: WorkflowJob['status'],
  created = '2026-11-01T10:00:00Z',
): WorkflowJob => ({
  ...workflowJob(id, processID),
  status,
  created,
  started: created,
  finished: status === 'running' ? null : created,
})

/** Jobs list responses, as `fetchJobsForWorkspace` returns them. */
export const jobsResponse = (jobs: WorkflowJob[]) => ({ jobs, links: [], numberTotal: jobs.length })

/** The workspace job page links in an element, in the order they appear. */
export const jobLinks = (container: HTMLElement) =>
  within(container)
    .queryAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => /^\/my-data\/workflow-outputs\/[^/?]+\/[^/?]+$/.test(href))
