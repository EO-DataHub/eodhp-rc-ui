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

/**
 * Opens the run panel through the store, as the Data Finder's Run buttons do. A source or saved
 * set is set first, as choosing it in the panel's Run on section does.
 */
export const openRunPanel = ({
  source,
  setId,
  item,
}: { source?: RunSource; setId?: string; item?: Item } = {}) =>
  act(() => {
    if (source) dataFinderStore.send({ type: 'setRunSource', source })
    if (setId) dataFinderStore.send({ type: 'setRunSetId', setId })
    dataFinderStore.send({ type: 'openRunPanel', item })
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

/**
 * The job rows of the Workflow outputs tab, in the order they appear: list items with a button
 * that opens the job.
 */
export const jobRowsIn = (container: HTMLElement) =>
  within(container)
    .queryAllByRole('listitem')
    .filter((row) => within(row).queryAllByRole('button').length > 0)

/** The job row with the given text. */
export const jobRow = (container: HTMLElement, text: string | RegExp) => {
  const row = jobRowsIn(container).find((entry) =>
    typeof text === 'string'
      ? entry.textContent?.includes(text)
      : text.test(entry.textContent ?? ''),
  )
  if (!row) throw new Error(`No job row with ${String(text)}`)
  return row
}

const RESULTS_REL = 'http://www.opengis.net/def/rel/ogc/1.0/results'

export const jobResultsHref = (id: string) =>
  `https://hub.example/api/workspaces/wf-ws/ades/ogc-api/jobs/${id}/results`

/**
 * An NDVI job for the job view, started at 14:02 UTC on 2 Nov 2026. A finished job took
 * `minutes`, and a successful one has a results link.
 */
export const viewedJob = (
  id: string,
  status: WorkflowJob['status'],
  { minutes = 3, message = '' }: { minutes?: number; message?: string } = {},
): WorkflowJob => {
  const started = '2026-11-02T14:02:00Z'
  return {
    ...workflowJob(id, 'ndvi'),
    status,
    message,
    created: started,
    started,
    finished:
      status === 'running'
        ? null
        : new Date(new Date(started).getTime() + minutes * 60_000).toISOString(),
    links:
      status === 'successful'
        ? [{ rel: RESULTS_REL, href: jobResultsHref(id), type: 'application/json' }]
        : [],
  }
}

export const resultItemHref = (id: string) =>
  `https://hub.example/api/catalogue/stac/catalogs/user/catalogs/wf-ws/catalogs/processing-results/collections/ndvi/items/${id}`

/** A job's results, as `fetchJobResults` returns them: a collection that links to its items. */
export const resultCollection = (itemIds: string[]) => ({
  type: 'Collection',
  id: 'ndvi-results',
  links: [
    { rel: 'self', href: 'https://hub.example/results/collection.json' },
    ...itemIds.map((id) => ({
      rel: 'item',
      href: resultItemHref(id),
      type: 'application/geo+json',
    })),
  ],
})

export const assetHref = (itemId: string, name: string) =>
  `https://hub.example/api/workspaces/wf-ws/files/${itemId}/${name}`

/** The titles of a result item's data assets and its other assets. */
export const DATA_ASSET_TITLES = ['NDVI GeoTIFF', 'Cloud mask']
export const OTHER_ASSET_TITLES = ['Thumbnail', 'Metadata']

/**
 * A result item whose assets list a thumbnail and metadata before its data: a COG with no role
 * and a PNG with the data role.
 */
export const resultItem = (id: string): Item =>
  ({
    id,
    type: 'Feature',
    collection: 'ndvi',
    properties: { datetime: '2026-11-02T14:05:00Z' },
    links: [{ rel: 'self', href: resultItemHref(id) }],
    assets: {
      thumbnail: {
        href: assetHref(id, 'thumb.png'),
        title: 'Thumbnail',
        type: 'image/png',
        roles: ['thumbnail'],
      },
      metadata: {
        href: assetHref(id, 'metadata.json'),
        title: 'Metadata',
        type: 'application/json',
        roles: ['metadata'],
      },
      ndvi: {
        href: assetHref(id, 'ndvi.tif'),
        title: 'NDVI GeoTIFF',
        type: 'image/tiff; application=geotiff; profile=cloud-optimized',
      },
      mask: {
        href: assetHref(id, 'mask.png'),
        title: 'Cloud mask',
        type: 'image/png',
        roles: ['data'],
      },
    },
  }) as unknown as Item

/** Answers `fetchItemByUrl` with the result item for the link. */
export const fetchResultItem = ({ itemUrl }: { itemUrl?: string }) =>
  Promise.resolve(resultItem((itemUrl ?? '').split('/').pop() ?? ''))

/** The workspace job page links in an element, in the order they appear. */
export const jobLinks = (container: HTMLElement) =>
  within(container)
    .queryAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => /^\/my-data\/workflow-outputs\/[^/?]+\/[^/?]+$/.test(href))
