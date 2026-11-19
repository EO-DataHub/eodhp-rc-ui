import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from '@xstate/store/react'
import type { InputParameterEntry, Item, ProcessDetail, ProcessRecord } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItemById } from '@/services/processCatalogueService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import type { SavedSet } from '@/services/savedSetsService'
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
  getAreaInputs,
  getItemInputs,
  getUserInputs,
  hasInputsToSet,
  initialUserValues,
  isDateRangeInput,
  isFullRecord,
  isHalfFilledRange,
  isRequired,
  plural,
  toLaunchValues,
  userValueText,
  type UserValues,
  type WorkflowInputs,
} from '@/library/workflowRunInputs'
import { CONFIRM_JOBS_ABOVE, MAX_JOBS_PER_RUN } from '@/constants/workflowRunLimits'
import { MAX_TOTAL_ITEMS, MAX_USER_COLLECTION_ITEMS, useSearchResultsQuery } from './useItemsQuery'
import { useSavedSet, useSavedSets } from './useSavedSets'
import { restoreAoiFromStorage } from '@/lib/terradraw/helpers/persistence'

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

export interface WorkflowRunOptions {
  /** The workflow to run. A list record is loaded in full. */
  workflow?: ProcessRecord | null
  /** The item to run on, for the item source. */
  item?: Item
  /** What to run on at first. Defaults to the item, or the pinned items with no item. */
  source?: RunSource
  /** The saved set to run on, for the saved set source. */
  savedSet?: SavedSet
  /** Used outside the Data Finder, so the drawn area is read from where the map saved it. */
  outsideDataFinder?: boolean
  /** When false, nothing is loaded. Defaults to true. */
  enabled?: boolean
  /** The user is choosing the source, so the data for every source is loaded. */
  choosingSource?: boolean
}

export const useWorkflowRun = ({
  workflow = null,
  item,
  source: initialSource,
  savedSet: initialSet,
  outsideDataFinder = false,
  enabled = true,
  choosingSource = false,
}: WorkflowRunOptions) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const finderAoi = useSelector(dataFinderStore, (state) => state.context.aoi)
  const [storedAoi, setStoredAoi] = useState<GeoJSON.Feature | null>(() =>
    outsideDataFinder ? restoreAoiFromStorage() : null,
  )
  const aoi = (outsideDataFinder ? storedAoi : finderAoi) ?? null
  const pinnedItems = useSelector(dataFinderStore, (state) => state.context.pinnedItems)
  const searchCollection = useSelector(dataFinderStore, (state) => state.context.collection)
  const isUserSearch = useSelector(dataFinderStore, (state) => state.context.isUserCollection)

  const startSource: RunSource = initialSource ?? (item ? 'item' : 'pinned')
  const [source, setSourceState] = useState<RunSource>(startSource)
  const [setId, setSetIdState] = useState<string | null>(initialSet?.id ?? null)

  // The workflow in full. A list record is loaded, and a response for an earlier request is ignored.
  const [loadedDetail, setLoadedDetail] = useState<ProcessDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [loadCount, setLoadCount] = useState(0)
  const requestRef = useRef(0)
  const workflowToLoad = enabled && workflow && !isFullRecord(workflow) ? workflow.id : null

  useEffect(() => {
    requestRef.current += 1
    const request = requestRef.current
    setDetailError(null)
    if (!workflowToLoad) {
      setIsLoadingDetail(false)
      return
    }
    setIsLoadingDetail(true)
    void fetchItemById(workflowToLoad).then(({ data, error }) => {
      if (request !== requestRef.current) return
      setIsLoadingDetail(false)
      if (error != null || !data) {
        setDetailError(error ?? 'Could not load workflow details. Please try again.')
        return
      }
      setLoadedDetail(data)
    })
  }, [workflowToLoad, loadCount])

  const detail: ProcessDetail | null = !workflow
    ? null
    : isFullRecord(workflow)
      ? workflow
      : loadedDetail?.id === workflow.id
        ? loadedDetail
        : null

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
  const resultsQuery = useSearchResultsQuery(
    enabled && (source === 'results' || choosingSource),
    true,
  )
  const setsQuery = useSavedSets(enabled && (source === 'set' || choosingSource))
  const setQuery = useSavedSet(
    enabled && source === 'set' && !!setId && setId !== initialSet?.id ? setId : undefined,
  )

  const chosenSet =
    source === 'set' ? (setId === initialSet?.id ? initialSet : setQuery.data) ?? null : null
  const chosenSetName =
    setId === initialSet?.id
      ? initialSet?.name
      : setsQuery.data?.find((summary) => summary.id === setId)?.name
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
  const resultsCapText = `The run uses the first ${resultsCap} results.`

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

  // Start again from the options each time the run is enabled, for example when a dialog opens
  useEffect(() => {
    if (!enabled) return
    setLoadedDetail(null)
    setSourceState(startSource)
    setSetIdState(initialSet?.id ?? null)
    const initialDetail = workflow && isFullRecord(workflow) ? workflow : null
    setValuesFor(initialDetail?.id ?? null)
    setValues(initialUserValues(initialDetail?.properties.inputParameters ?? NO_INPUTS))
    // The area can be drawn or cleared on the map in the meantime
    const currentAoi = outsideDataFinder ? restoreAoiFromStorage() : finderAoi
    setStoredAoi(outsideDataFinder ? currentAoi ?? null : null)
    setIncludeAoi(!!currentAoi)
    setLaunchError(null)
    setStartedJobs([])
    setFailedJobs([])
    setConfirmedKey(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const setSource = (next: RunSource) => {
    setConfirmedKey(null)
    setSourceState(next)
  }

  const setSetId = (next: string | null) => {
    setConfirmedKey(null)
    setSetIdState(next)
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

  const sourceText = (): string => {
    const count = items ? ` (${plural(items.length, 'item')})` : ''
    switch (source) {
      case 'item':
        return `item ${item?.id ?? ''}`
      case 'pinned':
        return `${plural(pinnedItems.length, 'pinned item')}`
      case 'set':
        return chosenSetName ? `the saved set ${chosenSetName}${count}` : 'a saved set'
      case 'results':
        return `all results of the search${count}`
    }
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
    option === 'results' && resultsCapped ? resultsCapText : undefined

  /** The chosen source can be run on: it is available and, for a saved set, a set is chosen. */
  const sourceReady = !sourceUnavailableReason(source) && (source !== 'set' || !!setId)

  const areaInputs = getAreaInputs(inputs)
  /**
   * Outside the Data Finder the user cannot draw an area, so a required area input with no drawn
   * area blocks the run. In the Data Finder the area checkbox says to draw one.
   */
  const missingRequiredArea =
    outsideDataFinder && !aoi && areaInputs.some(([, def]) => isRequired(def))

  /** Outside the Data Finder a drawn area is always sent to a required area input. */
  const areaLocked = outsideDataFinder && !!aoi && areaInputs.some(([, def]) => isRequired(def))
  const sendAoi = includeAoi || areaLocked

  const halfFilledRange = getUserInputs(inputs).some(
    ([key, def]) => isDateRangeInput(def) && isHalfFilledRange(values[key]),
  )

  const areaText = () => {
    if (!aoi) {
      return outsideDataFinder && !missingRequiredArea
        ? 'Full scene (no area drawn on the map)'
        : 'No area drawn on the map'
    }
    return sendAoi ? 'The area drawn on the map' : 'Not included, so the full scene'
  }

  const contextFor = (target: LaunchItem): WorkflowLaunchContext => ({
    item: target,
    aoi,
    includeAoi: sendAoi,
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
        err instanceof Error ? err.message : 'Failed to launch workflow. Please try again.',
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
    missingRequiredArea ||
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
    return true
  }

  const retryFailed = async () => {
    const result = await submit(failedJobs.map((job) => job.item))
    if (!result) return
    setStartedJobs((prev) => [...prev, ...result.started])
    setFailedJobs(result.failed)
  }

  /** One job on one item started, so the user can go straight to it. */
  const singleJobStarted = isSingleItem && startedJobs.length === 1 && failedJobs.length === 0

  return {
    workspace: currentWorkspace,
    outsideDataFinder,
    item,

    detail,
    workflowTitle,
    isLoadingDetail,
    detailError,
    reloadWorkflow: () => setLoadCount((count) => count + 1),
    inputs,
    hasInputsToSet: hasInputsToSet(inputs),

    source,
    setSource,
    setId,
    setSetId,
    savedSets: setsQuery,
    chosenSet,
    sourceText,
    sourceUnavailableReason,
    sourceNote,
    sourceReady,
    isSingleItem,

    items,
    jobCount,
    resultsCapped,
    resultsCapText,
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
    includeAoi: sendAoi,
    setIncludeAoi,
    areaLocked,
    missingRequiredArea,
    halfFilledRange,
    hubValueText,
    inputValueText,

    runBlocked,
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
