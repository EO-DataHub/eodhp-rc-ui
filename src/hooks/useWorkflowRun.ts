import { useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from '@xstate/store/react'
import type { InputParameterEntry, Item, ProcessDetail, ProcessRecord } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById } from '@/services/processCatalogueService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import {
  buildWorkflowVariables,
  getHubInputKind,
  type LaunchItem,
  type WorkflowLaunchContext,
} from '@/services/workflowVariableResolvers'
import {
  getHubApiOrigin,
  getSelfLinkHref,
  getWorkflowExecutionUrl,
} from '@/library/integrationTools'
import {
  savedSetLaunchItems,
  submitJobs,
  type FailedJob,
  type FanOutResult,
  type StartedJob,
} from '@/library/workflowFanOut'
import { isPrivateItem } from '@/library/catalogUtils'
import {
  getItemInputs,
  getUserInputs,
  hasInputsToSet,
  initialUserValues,
  isDateRangeInput,
  isFullRecord,
  isHalfFilledRange,
  toLaunchValues,
  userValueText,
  type UserValues,
  type WorkflowInputs,
} from '@/library/workflowRunInputs'
import { CONFIRM_JOBS_ABOVE, MAX_JOBS_PER_RUN } from '@/constants/workflowRunLimits'
import { MAX_TOTAL_ITEMS, MAX_USER_COLLECTION_ITEMS, useSearchResultsQuery } from './useItemsQuery'
import { useSavedSet, useSavedSets } from './useSavedSets'

/** What the workflow runs on. Each item in the source gets its own job. */
export type RunSource = 'item' | 'pinned' | 'set' | 'results'

export const SOURCE_LABELS: Record<RunSource, string> = {
  item: 'This item',
  pinned: 'Pinned items',
  set: 'Saved set',
  results: 'All results',
}

export const SOURCES: RunSource[] = ['item', 'pinned', 'set', 'results']

const NO_INPUTS: WorkflowInputs = {}

interface WorkflowRunOptions {
  /** The workflow to run. A list record is loaded in full. */
  workflow?: ProcessRecord | null
  /** The item to run on, for the item source. */
  item?: Item
  source: RunSource
  onSourceChange: (source: RunSource) => void
  /** The saved set to run on, for the saved set source. */
  setId?: string | null
  onSetIdChange: (setId: string) => void
  /** Called with the jobs each run or retry started. */
  onJobsStarted?: (jobs: StartedJob[]) => void
  /** The user is choosing the source, so the data for every source is loaded. */
  choosingSource?: boolean
}

export const useWorkflowRun = ({
  workflow = null,
  item,
  source,
  onSourceChange,
  setId = null,
  onSetIdChange,
  onJobsStarted,
  choosingSource = false,
}: WorkflowRunOptions) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi) ?? null
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)
  const searchCollection = useSelector(dataFinderStore, (state) => state.context.collection)
  const isUserSearch = useSelector(dataFinderStore, (state) => state.context.isUserCollection)

  // A list record has no inputs, so the workflow is loaded in full
  const detailQuery = useQuery({
    queryKey: ['WorkflowDetail', workflow?.id],
    queryFn: async () => {
      const { data, error } = await fetchItemById(workflow!.id)
      if (error != null || !data) {
        throw new Error(error ?? 'Could not load workflow details. Please try again.')
      }
      return data
    },
    enabled: !!workflow && !isFullRecord(workflow),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const detail: ProcessDetail | null = !workflow
    ? null
    : isFullRecord(workflow)
      ? workflow
      : detailQuery.data ?? null

  const inputs = detail?.properties.inputParameters ?? NO_INPUTS
  const workflowTitle = detail?.properties.title ?? detail?.id ?? ''

  // The values start from the workflow's defaults each time a different workflow loads
  const [values, setValues] = useState<UserValues>(() => initialUserValues(inputs))
  const [valuesFor, setValuesFor] = useState<string | null>(detail?.id ?? null)
  if (detail && detail.id !== valuesFor) {
    setValuesFor(detail.id)
    setValues(initialUserValues(inputs))
  }

  const [includeAoi, setIncludeAoi] = useState(!!aoi)
  useEffect(() => {
    setIncludeAoi(!!aoi)
  }, [aoi])

  const [isLaunching, setIsLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [startedJobs, setStartedJobs] = useState<StartedJob[]>([])
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([])

  // Source data is only fetched while it can be chosen or is in use
  const resultsQuery = useSearchResultsQuery(source === 'results' || choosingSource, true)
  const setsQuery = useSavedSets(source === 'set' || choosingSource)
  const setQuery = useSavedSet(source === 'set' && setId ? setId : undefined)

  const chosenSet = source === 'set' ? setQuery.data ?? null : null
  const results =
    resultsQuery.isSuccess && !resultsQuery.isPlaceholderData ? resultsQuery.data : undefined

  /** The items to run on, one job each. Undefined while they load. */
  const items: LaunchItem[] | undefined = useMemo(() => {
    switch (source) {
      case 'item':
        return item ? [item] : []
      case 'pinned':
        return pinnedItems
      case 'set':
        return chosenSet ? savedSetLaunchItems(chosenSet) : undefined
      case 'results':
        return results
    }
  }, [source, item, pinnedItems, chosenSet, results])

  const isSingleItem = source === 'item'

  // The Items tab holds at most this many results, so "All results" can be cut short
  const resultsCap =
    isUserSearch || searchCollection?.isJobCollection ? MAX_USER_COLLECTION_ITEMS : MAX_TOTAL_ITEMS
  const resultsCapped = !!results && results.length >= resultsCap

  const jobCount = items?.length ?? 0
  const needsConfirmation = !isSingleItem && jobCount > CONFIRM_JOBS_ABOVE
  const aboveCeiling = jobCount > MAX_JOBS_PER_RUN

  // A confirmation holds only for the items it was given for
  const confirmKey = `${source}|${setId ?? ''}|${jobCount}`
  const [confirmedKey, setConfirmedKey] = useState<string | null>(null)
  // Forget a confirmation once the items change, so returning to the same count asks again
  if (confirmedKey !== null && confirmedKey !== confirmKey) setConfirmedKey(null)
  const confirmed = confirmedKey === confirmKey
  const setConfirmed = (value: boolean) => setConfirmedKey(value ? confirmKey : null)

  const setSource = (next: RunSource) => {
    setConfirmedKey(null)
    onSourceChange(next)
  }

  const setSetId = (next: string) => {
    setConfirmedKey(null)
    onSetIdChange(next)
  }

  const isItemPrivate = (target: LaunchItem) => {
    const fromSearch =
      source === 'results' || (!!searchCollection && target.collection === searchCollection.id)
    return isPrivateItem({
      isUserCollection: target.isUserCollection ?? (fromSearch ? isUserSearch : undefined),
      collection: target.collectionRef ?? (fromSearch ? searchCollection : null),
      href: getSelfLinkHref(target),
    })
  }

  const sourceUnavailableReason = (option: RunSource): string | undefined => {
    switch (option) {
      case 'item':
        return item ? undefined : 'Open an item on the map to run on it'
      case 'pinned':
        return pinnedItems.length > 0 ? undefined : 'Pin some items on the map first'
      case 'set':
        if (!token || !currentWorkspace) return 'Select a workspace to use saved sets'
        if (setsQuery.error) return setsQuery.error.message
        return setsQuery.data && setsQuery.data.length === 0 ? 'Save a set first' : undefined
      case 'results':
        if (!searchCollection) return 'Search for items in the Data Finder first'
        return results && results.length === 0 ? 'The search has no results' : undefined
    }
  }

  const sourceNote = (option: RunSource): string | undefined =>
    option === 'results' && resultsCapped
      ? `The run uses the first ${resultsCap} results.`
      : undefined

  const halfFilledRange = getUserInputs(inputs).some(
    ([key, def]) => isDateRangeInput(def) && isHalfFilledRange(values[key]),
  )

  const areaText = () => {
    if (!aoi) return 'No area drawn on the map'
    return includeAoi ? 'The area drawn on the map' : 'Not included, so the full scene'
  }

  const contextFor = (target: LaunchItem): WorkflowLaunchContext => ({
    item: target,
    aoi,
    includeAoi,
    workspace: currentWorkspace,
    apiBaseUrl: getHubApiOrigin(),
  })

  const itemInputs = getItemInputs(inputs)

  /** Item inputs the workflow reads by link, without staging the data in first. */
  const linkOnlyItemInputs = itemInputs.filter(([, def]) => def.cwlType !== 'Directory')

  /** Private items cannot be read by link, because the job has no access to them. */
  const privateItemCount =
    linkOnlyItemInputs.length > 0 && items ? items.filter(isItemPrivate).length : 0

  /** Items the Hub cannot fill the item inputs for, because they have no self link. */
  const itemsWithoutLink =
    itemInputs.length > 0 && items ? items.filter((target) => !getSelfLinkHref(target)) : []

  const hubValueText = (key: string, def: InputParameterEntry) => {
    switch (getHubInputKind(key, def)) {
      case 'item':
        if (isSingleItem) {
          return item && getSelfLinkHref(item) ? `Item ${item.id}` : 'Not available'
        }
        return 'The link of each item'
      case 'area':
        return areaText()
      default: {
        const resolved = new Set(
          (items ?? []).map((target) => buildWorkflowVariables(inputs, contextFor(target))[key]),
        )
        if (resolved.size > 1) return 'Set for each item'
        const [value] = Array.from(resolved)
        return value ?? 'Not available'
      }
    }
  }

  const inputValueText = (key: string, def: InputParameterEntry) =>
    getHubInputKind(key, def) ? hubValueText(key, def) : userValueText(def, values[key])

  const setValue = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  /** Starts a job for each item. Returns null when no job could be sent. */
  const submit = async (targets: LaunchItem[]): Promise<FanOutResult | null> => {
    if (!detail || !token || !currentWorkspace) return null

    const executionUrl = getWorkflowExecutionUrl(detail)
    if (!executionUrl) {
      setLaunchError('Workflow execution URL not found. Please contact support.')
      return null
    }

    setIsLaunching(true)
    setLaunchError(null)
    try {
      const { access } = await fetchWorkspaceTokens(currentWorkspace, token)
      const userValues = toLaunchValues(inputs, values)
      return await submitJobs(targets, (target) =>
        launchWorkflow(
          executionUrl,
          { ...buildWorkflowVariables(inputs, contextFor(target)), ...userValues },
          access,
        ),
      )
    } catch (err) {
      setLaunchError(
        err instanceof Error ? err.message : "Couldn't start the workflow. Please try again.",
      )
      return null
    } finally {
      setIsLaunching(false)
    }
  }

  /** Something about the items or the inputs stops the run. */
  const runBlocked =
    !items ||
    items.length === 0 ||
    itemsWithoutLink.length > 0 ||
    privateItemCount > 0 ||
    halfFilledRange ||
    aboveCeiling ||
    (needsConfirmation && !confirmed)

  const canRun = !!detail && !!currentWorkspace && !!token && !runBlocked && !isLaunching

  /** Starts the jobs. Resolves to true when the run started, even if some jobs failed to start. */
  const run = async (): Promise<boolean> => {
    if (!items || runBlocked) return false
    const result = await submit(items)
    if (!result) return false
    // A single job that fails is shown as an error, so the user can change the inputs
    if (items.length === 1 && result.failed.length === 1) {
      setLaunchError(result.failed[0].error)
      return false
    }
    setStartedJobs(result.started)
    setFailedJobs(result.failed)
    onJobsStarted?.(result.started)
    return true
  }

  const retryFailed = async () => {
    const result = await submit(failedJobs.map((job) => job.item))
    if (!result) return
    setStartedJobs((prev) => [...prev, ...result.started])
    setFailedJobs(result.failed)
    onJobsStarted?.(result.started)
  }

  /** One job on one item started, so the user can go straight to it. */
  const singleJobStarted = isSingleItem && startedJobs.length === 1 && failedJobs.length === 0

  return {
    workspace: currentWorkspace,
    item,

    detail,
    workflowTitle,
    detailError: detailQuery.error?.message ?? null,
    reloadWorkflow: () => void detailQuery.refetch(),
    inputs,
    hasInputsToSet: hasInputsToSet(inputs),

    source,
    setSource,
    setId,
    setSetId,
    savedSets: setsQuery,
    sourceUnavailableReason,
    sourceNote,
    isSingleItem,

    items,
    jobCount,
    needsConfirmation,
    aboveCeiling,
    confirmed,
    setConfirmed,
    privateItemCount,
    itemInputs,
    itemsWithoutLink,

    values,
    setValue,
    aoi,
    includeAoi,
    setIncludeAoi,
    hubValueText,
    inputValueText,

    canRun,
    isLaunching,
    launchError,
    clearLaunchError: () => setLaunchError(null),
    run,
    startedJobs,
    failedJobs,
    retryFailed,
    singleJobStarted,
  }
}

export type WorkflowRun = ReturnType<typeof useWorkflowRun>
